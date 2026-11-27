// functions/elektrines/foxessSync.js
const axios = require("axios");
const crypto = require("crypto");

const DEFAULT_FOXESS_BASE = "https://www.foxesscloud.com";
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

function getLtDateInfo() {
  const now = new Date();
  const ltToday = now.toLocaleDateString("lt-LT", {
    timeZone: "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const currentHourInt = parseInt(
    now.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Vilnius",
      hour: "2-digit",
      hour12: false,
    }),
    10
  );
  return {
    todayStr: ltToday,
    year: parseInt(ltToday.slice(0, 4), 10),
    month: parseInt(ltToday.slice(5, 7), 10),
    monthStr: ltToday.slice(0, 7),
    currentHourInt,
  };
}

/**
 * Oficialus FoxESS Open API užklausos siuntėjas su MD5 parašu
 */
async function foxApiRequest(apiKey, method, path, body = null, baseUrl = DEFAULT_FOXESS_BASE) {
  const cleanBase = (baseUrl || DEFAULT_FOXESS_BASE).replace(/\/+$/, "");
  const pathOnly = path.split("?")[0];
  const timestamp = String(Date.now());
  // FoxESS Open API specifikacija reikalauja literalaus "\r\n" tarp dalių
  const rawSig = `${pathOnly}\\r\\n${apiKey}\\r\\n${timestamp}`;
  const signature = crypto.createHash("md5").update(rawSig).digest("hex");

  const headers = {
    token: apiKey,
    timestamp,
    signature,
    lang: "en",
    "Content-Type": "application/json",
  };

  const url = `${cleanBase}${path}`;
  const res =
    method === "GET"
      ? await axios.get(url, { headers, timeout: 12000 })
      : await axios.post(url, body || {}, { headers, timeout: 12000 });

  if (res.data?.errno && res.data.errno !== 0) {
    throw new Error(`FoxESS API klaida (${res.data.errno}): ${res.data.msg || "Nepavyko"}`);
  }
  return res.data?.result;
}

/**
 * Sujungia gretimas valandas (pvz. [1, 2, 3, 14, 15]) į laiko intervalus FoxESS Scheduler'iui (iki 8 grupių)
 */
function mergeHoursToIntervals(hoursList) {
  const sorted = [...new Set(hoursList)].sort((a, b) => a - b);
  const intervals = [];
  for (const h of sorted) {
    const last = intervals[intervals.length - 1];
    if (last && h === last.endHour + 1) {
      last.endHour = h;
    } else {
      intervals.push({ startHour: h, endHour: h });
    }
  }
  return intervals;
}

/**
 * Nuskaito visus vartotojo FoxESS inverterius (P3-12.0-SH), 3 MPPT, 14.04 kWh bateriją ir ESO skaitiklį
 */
async function syncUserFoxEssTelemetry(db, admin, userId) {
  if (!userId) throw new Error("Trūksta userId.");

  const secretSnap = await db.collection("foxess_secrets").where("userId", "==", userId).get();
  if (secretSnap.empty) {
    throw new Error("Vartotojas dar neprijungė FoxESS paskyros.");
  }

  const existingSnap = await db
    .collection("user_smart_devices")
    .where("userId", "==", userId)
    .where("type", "==", "solar")
    .where("brand", "==", "foxess")
    .get();

  const existingBySn = {};
  existingSnap.forEach((d) => {
    const data = d.data();
    const sn = data?.telemetry?.deviceSn;
    if (sn) existingBySn[sn] = { docId: d.id, ...data };
  });

  const { year } = getLtDateInfo();
  const syncedResults = [];

  for (const secretDoc of secretSnap.docs) {
    const sec = secretDoc.data();
    const apiKey = sec.apiToken;
    const baseUrl = sec.serverUri || DEFAULT_FOXESS_BASE;
    if (!apiKey) continue;

    const listRes = await foxApiRequest(
      apiKey,
      "POST",
      "/op/v0/device/list",
      { currentPage: 1, pageSize: 20 },
      baseUrl
    );

    const devices = listRes?.data || [];
    if (devices.length === 0) {
      throw new Error("FoxESS paskyroje nerasta nė vieno prijungto keitiklio.");
    }

    for (let idx = 0; idx < devices.length; idx++) {
      const d = devices[idx];
      const sn = String(d.deviceSN || d.sn || "");
      if (!sn) continue;

      await sleepMs(1100);

      let realMap = {};
      let genRes = {};
      let yearKwh = 0;

      try {
        const realArr = await foxApiRequest(
          apiKey,
          "POST",
          "/op/v0/device/real/query",
          {
            sn,
            variables: [
              "pvPower",
              "pv1Power",
              "pv2Power",
              "pv3Power",
              "generationPower",
              "SoC",
              "batTemperature",
              "batChargePower",
              "batDischargePower",
              "gridConsumptionPower",
              "feedinPower",
              "loadsPower",
            ],
          },
          baseUrl
        );
        const datas = realArr?.[0]?.datas || [];
        datas.forEach((item) => {
          realMap[item.variable] = Number(item.value ?? 0);
        });
      } catch (e) {
        console.warn(`⚠️ FoxESS real/query (${sn}):`, e.message);
      }

      await sleepMs(1100);

      try {
        genRes =
          (await foxApiRequest(
            apiKey,
            "GET",
            `/op/v0/device/generation?sn=${encodeURIComponent(sn)}`,
            null,
            baseUrl
          )) || {};
      } catch (e) {
        console.warn(`⚠️ FoxESS generation (${sn}):`, e.message);
      }

      await sleepMs(1100);

      try {
        const repRes = await foxApiRequest(
          apiKey,
          "POST",
          "/op/v0/device/report/query",
          { sn, year, dimension: "year", variables: ["generation"] },
          baseUrl
        );
        const vals = repRes?.[0]?.values || [];
        yearKwh = vals.reduce((acc, v) => acc + Number(v || 0), 0);
      } catch (e) {}

      const currentPowerKw = parseFloat(Number(realMap.pvPower ?? realMap.generationPower ?? 0).toFixed(2));
      const currentPowerW = Math.round(currentPowerKw * 1000);
      const todayKwh = parseFloat(Number(genRes.today ?? 0).toFixed(2));
      const monthKwh = parseFloat(Number(genRes.month ?? 0).toFixed(1));
      const totalKwh = parseFloat(Number(genRes.cumulative ?? 0).toFixed(1));

      const batChargeKw = Number(realMap.batChargePower ?? 0);
      const batDischargeKw = Number(realMap.batDischargePower ?? 0);
      const batteryPowerKw = parseFloat((batChargeKw - batDischargeKw).toFixed(2));
      const batterySocPct = realMap.SoC !== undefined ? Math.round(Number(realMap.SoC)) : null;
      const batteryTempC = realMap.batTemperature !== undefined ? parseFloat(Number(realMap.batTemperature).toFixed(1)) : null;

      const deviceType = String(d.deviceType || "FoxESS P3-12.0-SH");
      const isHybrid =
        !!d.hasBattery ||
        batterySocPct !== null ||
        deviceType.toUpperCase().includes("H3") ||
        deviceType.toUpperCase().includes("P3") ||
        deviceType.toUpperCase().includes("SH");

      const targetDocId = `foxess_${userId}_${sn}`;
      const prevData = existingBySn[sn];
      const prevCfg = prevData?.config || {};
      const prevBatCfg = prevCfg.battery || {};

      const docPayload = {
        id: targetDocId,
        userId,
        type: "solar",
        brand: "foxess",
        name: prevData?.name || `Saulės elektrinė: ${d.stationName || deviceType}`,
        config: {
          panelsKwp: Number(prevCfg.panelsKwp ?? 7.44),
          inverterKw: Number(prevCfg.inverterKw ?? 12.0),
          surplusThresholdKw: Number(prevCfg.surplusThresholdKw ?? 1.5),
          lat: Number(prevCfg.lat ?? 55.2885),
          lng: Number(prevCfg.lng ?? 23.9745),
          battery: {
            autopilotEnabled: prevBatCfg.autopilotEnabled ?? false,
            batteryCapacityKwh: Number(prevBatCfg.batteryCapacityKwh ?? 14.04),
            chargeMode: prevBatCfg.chargeMode || "cheapest_hours",
            cheapHoursCount: Number(prevBatCfg.cheapHoursCount ?? 4),
            maxChargePriceCt: Number(prevBatCfg.maxChargePriceCt ?? 6.0),
            chargeTargetSoc: Number(prevBatCfg.chargeTargetSoc ?? 90),
            minSocBackup: Number(prevBatCfg.minSocBackup ?? 20),
            chargePowerKw: Number(prevBatCfg.chargePowerKw ?? 6.0),
            peakMode: prevBatCfg.peakMode || "self_use",
            dischargeMinPriceCt: Number(prevBatCfg.dischargeMinPriceCt ?? 25.0),
            dischargePowerKw: Number(prevBatCfg.dischargePowerKw ?? 6.0),
          },
        },
        telemetry: {
          ...(prevData?.telemetry || {}),
          plantId: sn,
          plantName: d.stationName || deviceType,
          deviceSn: sn,
          modelInfo: deviceType,
          isHybrid,
          currentPowerW,
          currentPowerKw,
          todayKwh,
          monthKwh,
          yearKwh: parseFloat(yearKwh.toFixed(1)),
          totalKwh,
          batterySocPct,
          batteryPowerKw,
          batteryTempC,
          loadPowerKw: parseFloat(Number(realMap.loadsPower ?? 0).toFixed(2)),
          gridImportKw: parseFloat(Number(realMap.gridConsumptionPower ?? 0).toFixed(2)),
          gridExportKw: parseFloat(Number(realMap.feedinPower ?? 0).toFixed(2)),
          mpptKw: {
            pv1: parseFloat(Number(realMap.pv1Power ?? 0).toFixed(2)),
            pv2: parseFloat(Number(realMap.pv2Power ?? 0).toFixed(2)),
            pv3: parseFloat(Number(realMap.pv3Power ?? 0).toFixed(2)),
          },
          isOnline: Number(d.status) === 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("user_smart_devices").doc(targetDocId).set(docPayload, { merge: true });
      syncedResults.push(docPayload);
    }
  }

  return syncedResults;
}

/**
 * Grąžina grafikus (Šiandien / 7 d. / Šie metai) identišku formatu kaip Growatt
 */
async function getFoxEssChartsData(db, userId, sn) {
  if (!userId || !sn) throw new Error("Trūksta userId arba sn.");

  const secretSnap = await db.collection("foxess_secrets").where("userId", "==", userId).get();
  if (secretSnap.empty) throw new Error("FoxESS raktas nerastas.");

  const sec = secretSnap.docs[0].data();
  const apiKey = sec.apiToken;
  const baseUrl = sec.serverUri || DEFAULT_FOXESS_BASE;
  const { todayStr, year, month, monthStr } = getLtDateInfo();

  let todayPowers = [];
  let monthDays = [];
  let yearMonths = [];

  try {
    const startOfDay = new Date(`${todayStr}T00:00:00+02:00`).getTime();
    const endOfDay = Date.now();
    const histRes = await foxApiRequest(
      apiKey,
      "POST",
      "/op/v0/device/history/query",
      { sn, variables: ["pvPower"], begin: startOfDay, end: endOfDay },
      baseUrl
    );
    const pts = histRes?.[0]?.datas?.[0]?.data || [];
    todayPowers = pts.map((p) => ({
      time: String(p.time || "").slice(11, 16),
      powerW: Math.round(Number(p.value || 0) * 1000),
    }));
  } catch (e) {}

  await sleepMs(1100);

  try {
    const mRes = await foxApiRequest(
      apiKey,
      "POST",
      "/op/v0/device/report/query",
      { sn, year, month, dimension: "month", variables: ["generation"] },
      baseUrl
    );
    const values = mRes?.[0]?.values || [];
    const todayDayNum = parseInt(todayStr.slice(8, 10), 10);
    const startDay = Math.max(1, todayDayNum - 6);
    for (let day = startDay; day <= todayDayNum; day++) {
      const kwh = parseFloat(Number(values[day - 1] || 0).toFixed(2));
      const dd = String(day).padStart(2, "0");
      const mm = String(month).padStart(2, "0");
      monthDays.push({
        date: `${year}-${mm}-${dd}`,
        label: `${mm}-${dd}`,
        kwh,
      });
    }
  } catch (e) {}

  await sleepMs(1100);

  try {
    const yRes = await foxApiRequest(
      apiKey,
      "POST",
      "/op/v0/device/report/query",
      { sn, year, dimension: "year", variables: ["generation"] },
      baseUrl
    );
    const values = yRes?.[0]?.values || [];
    const ltMonths = ["Sau", "Vas", "Kov", "Bal", "Geg", "Bir", "Lie", "Rgp", "Rgs", "Spa", "Lap", "Grd"];
    yearMonths = values.slice(0, month).map((v, idx) => ({
      date: `${year}-${String(idx + 1).padStart(2, "0")}`,
      label: ltMonths[idx] || String(idx + 1),
      kwh: parseFloat(Number(v || 0).toFixed(1)),
    }));
  } catch (e) {}

  const curMonthObj = yearMonths.find((m) => m.date === monthStr);
  const last7TotalKwh = parseFloat(monthDays.reduce((acc, d) => acc + d.kwh, 0).toFixed(1));
  const monthTotalKwh = curMonthObj ? curMonthObj.kwh : last7TotalKwh;
  const yearTotalKwh = parseFloat(yearMonths.reduce((acc, m) => acc + m.kwh, 0).toFixed(1));
  const todayItem = monthDays.find((d) => d.date === todayStr);

  return {
    todayStr,
    monthStr,
    todayKwhFromChart: todayItem ? todayItem.kwh : null,
    last7TotalKwh,
    monthTotalKwh,
    yearTotalKwh,
    todayPowers,
    monthDays,
    yearMonths,
  };
}

/**
 * Siunčia baterijos valdymo komandą arba pilną dienos Nord Pool grafiką į FoxESS Scheduler v1
 */
async function controlFoxEssBattery(db, admin, userId, deviceDocId, action) {
  const devRef = db.collection("user_smart_devices").doc(deviceDocId);
  const devDoc = await devRef.get();
  if (!devDoc.exists) throw new Error("FoxESS įrenginys nerastas.");

  const dev = devDoc.data();
  if (dev.userId !== userId) throw new Error("Neturite prieigos prie šio įrenginio.");

  const sn = dev.telemetry?.deviceSn;
  if (!sn) throw new Error("Trūksta FoxESS serijinio numerio (SN).");

  const secretSnap = await db.collection("foxess_secrets").where("userId", "==", userId).get();
  if (secretSnap.empty) throw new Error("Nerastas FoxESS API raktas.");

  const sec = secretSnap.docs[0].data();
  const apiKey = sec.apiToken;
  const baseUrl = sec.serverUri || DEFAULT_FOXESS_BASE;
  const bCfg = dev.config?.battery || {};
  const minSocBackup = Math.max(10, Math.min(50, Number(bCfg.minSocBackup ?? 20)));
  const targetSoc = Math.max(50, Math.min(100, Number(bCfg.chargeTargetSoc ?? 90)));
  const chargePwrW = Math.round(Number(bCfg.chargePowerKw ?? 6.0) * 1000);
  const dischargePwrW = Math.round(Number(bCfg.dischargePowerKw ?? 6.0) * 1000);

  // 1. Nustatome saugų baterijos rezervą (Min SoC)
  try {
    await foxApiRequest(
      apiKey,
      "POST",
      "/op/v0/device/battery/soc/set",
      { sn, minSoc: Math.max(10, minSocBackup - 5), minSocOnGrid: minSocBackup },
      baseUrl
    );
    await sleepMs(1100);
  } catch (e) {
    console.warn("FoxESS minSoc set įspėjimas:", e.message);
  }

  const { todayStr, currentHourInt } = getLtDateInfo();
  let decisionText = "";

  // A) Grįžti į įprastą Savą vartojimą (Self-Use) ir išjungti Scheduler
  if (action === "self_use") {
    await foxApiRequest(
      apiKey,
      "POST",
      "/op/v1/device/scheduler/set/flag",
      { deviceSN: sn, enable: 0 },
      baseUrl
    );
    decisionText = "🏠 Savas vartojimas (Self-Use)";
  }
  // B) Rankinis 1 valandos įkrovimas iš tinklo DABAR
  else if (action === "force_charge_now") {
    const groups = [
      {
        enable: 1,
        startHour: currentHourInt,
        startMinute: 0,
        endHour: currentHourInt,
        endMinute: 59,
        workMode: "ForceCharge",
        minSocOnGrid: minSocBackup,
        fdSoc: targetSoc,
        maxSoc: targetSoc,
        fdPwr: chargePwrW,
      },
    ];
    await foxApiRequest(apiKey, "POST", "/op/v1/device/scheduler/enable", { deviceSN: sn, groups }, baseUrl);
    decisionText = `⚡ Rankinis įkrovimas (${currentHourInt}:00–${currentHourInt}:59 iki ${targetSoc}%)`;
  }
  // C) Rankinis 1 valandos iškrovimas į tinklą DABAR
  else if (action === "force_discharge_now") {
    const groups = [
      {
        enable: 1,
        startHour: currentHourInt,
        startMinute: 0,
        endHour: currentHourInt,
        endMinute: 59,
        workMode: "ForceDischarge",
        minSocOnGrid: minSocBackup,
        fdSoc: minSocBackup,
        fdPwr: dischargePwrW,
      },
    ];
    await foxApiRequest(apiKey, "POST", "/op/v1/device/scheduler/enable", { deviceSN: sn, groups }, baseUrl);
    decisionText = `💰 Rankinis iškrovimas (${currentHourInt}:00–${currentHourInt}:59 iki ${minSocBackup}%)`;
  }
  // D) Pilnas šios dienos Nord Pool grafikas (sujungiamas į nepertraukiamus langus)
  else if (action === "apply_nordpool_schedule") {
    const elecDoc = await db.collection("electricity_prices").doc("market_data").get();
    const allHours = elecDoc.exists ? elecDoc.data().hours || [] : [];
    const todayHours = allHours.filter((h) => h.date === todayStr);
    if (todayHours.length === 0) {
      throw new Error("Šiandienos Nord Pool kainos dar neįkeltos.");
    }

    let chargeHours = [];
    if ((bCfg.chargeMode || "cheapest_hours") === "cheapest_hours") {
      const count = Math.max(1, Math.min(10, Number(bCfg.cheapHoursCount ?? 4)));
      chargeHours = [...todayHours]
        .sort((a, b) => a.priceCtNoVat - b.priceCtNoVat)
        .slice(0, count)
        .map((h) => h.hour);
    } else {
      const maxCt = Number(bCfg.maxChargePriceCt ?? 6.0);
      chargeHours = todayHours.filter((h) => h.priceCtNoVat <= maxCt).map((h) => h.hour);
    }

    const chargeSet = new Set(chargeHours);
    let dischargeHours = [];
    if (bCfg.peakMode === "force_discharge") {
      const minDisCt = Number(bCfg.dischargeMinPriceCt ?? 25.0);
      dischargeHours = todayHours
        .filter((h) => !chargeSet.has(h.hour) && h.priceCtNoVat >= minDisCt)
        .map((h) => h.hour);
    }

    const groups = [];
    mergeHoursToIntervals(chargeHours).forEach((iv) => {
      if (groups.length < 8) {
        groups.push({
          enable: 1,
          startHour: iv.startHour,
          startMinute: 0,
          endHour: iv.endHour,
          endMinute: 59,
          workMode: "ForceCharge",
          minSocOnGrid: minSocBackup,
          fdSoc: targetSoc,
          maxSoc: targetSoc,
          fdPwr: chargePwrW,
        });
      }
    });

    mergeHoursToIntervals(dischargeHours).forEach((iv) => {
      if (groups.length < 8) {
        groups.push({
          enable: 1,
          startHour: iv.startHour,
          startMinute: 0,
          endHour: iv.endHour,
          endMinute: 59,
          workMode: "ForceDischarge",
          minSocOnGrid: minSocBackup,
          fdSoc: minSocBackup,
          fdPwr: dischargePwrW,
        });
      }
    });

    if (groups.length === 0) {
      await foxApiRequest(apiKey, "POST", "/op/v1/device/scheduler/set/flag", { deviceSN: sn, enable: 0 }, baseUrl);
      decisionText = `🏠 Nord Pool (${todayStr}): įkrovimo valandų nebuvo -> Self-Use`;
    } else {
      await foxApiRequest(apiKey, "POST", "/op/v1/device/scheduler/enable", { deviceSN: sn, groups }, baseUrl);
      decisionText = `🤖 Nord Pool (${todayStr}): ${chargeHours.length} val. įkrovimas${dischargeHours.length > 0 ? `, ${dischargeHours.length} val. pardavimas` : ""}`;
    }
  }

  await devRef.update({
    "telemetry.lastBatteryDecision": decisionText,
    "telemetry.lastScheduleDate": todayStr,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, decision: decisionText };
}

/**
 * Kasvalandinis FoxESS sinchronizavimas + dienos Nord Pool grafiko atnaujinimas (kartą per parą 00:00 arba jei dar nepaskirtas šiandienai)
 */
async function executeHourlyFoxEssSyncAndAutopilot(db, admin) {
  console.log("🔋 Vykdomas kasvalandinis FoxESS atnaujinimas ir Nord Pool baterijų patikra...");
  try {
    const secretSnap = await db.collection("foxess_secrets").get();
    const userIds = new Set();
    secretSnap.forEach((doc) => {
      const uid = doc.data()?.userId;
      if (uid) userIds.add(uid);
    });

    const { todayStr } = getLtDateInfo();

    for (const uid of userIds) {
      try {
        const synced = await syncUserFoxEssTelemetry(db, admin, uid);
        for (const dev of synced) {
          const bCfg = dev.config?.battery || {};
          if (bCfg.autopilotEnabled && dev.telemetry?.lastScheduleDate !== todayStr) {
            await sleepMs(1100);
            await controlFoxEssBattery(db, admin, uid, dev.id, "apply_nordpool_schedule");
          }
        }
      } catch (e) {
        console.warn(`⚠️ FoxESS klaida vartotojui ${uid}:`, e.message);
      }
    }
  } catch (err) {
    console.error("❌ FoxESS kasvalandinio ciklo klaida:", err.message);
  }
}

module.exports = {
  syncUserFoxEssTelemetry,
  getFoxEssChartsData,
  controlFoxEssBattery,
  executeHourlyFoxEssSyncAndAutopilot,
};