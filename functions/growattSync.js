// functions/growattSync.js
const axios = require("axios");

const DEFAULT_GROWATT_BASE = "https://openapi.growatt.com";

function getLtDateStrings() {
  const now = new Date();
  const ltToday = now.toLocaleDateString("lt-LT", {
    timeZone: "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }); // YYYY-MM-DD
  const yearStr = ltToday.slice(0, 4);
  const monthStr = ltToday.slice(0, 7);
  return {
    todayStr: ltToday,
    monthStartStr: `${monthStr}-01`,
    yearStartStr: `${yearStr}-01-01`,
    yearStr,
    monthStr,
  };
}

/**
 * Nuskaito visas vartotojo Growatt elektrines (Plants), jų inverterius ir mėnesio/metų sumas
 */
async function syncUserGrowattTelemetry(db, admin, userId) {
  if (!userId) throw new Error("Trūksta userId.");

  const secretSnap = await db.collection("growatt_secrets").where("userId", "==", userId).get();
  if (secretSnap.empty) {
    throw new Error("Vartotojas dar neprijungė Growatt paskyros (growatt_secrets tuščias).");
  }

  const existingSnap = await db
    .collection("user_smart_devices")
    .where("userId", "==", userId)
    .where("type", "==", "solar")
    .get();

  const existingByPlantId = {};
  const legacySolarDocs = [];
  existingSnap.forEach((d) => {
    const data = d.data();
    const pId = data?.telemetry?.plantId ? String(data.telemetry.plantId) : null;
    if (pId) existingByPlantId[pId] = { docId: d.id, ...data };
    else legacySolarDocs.push({ docId: d.id, ...data });
  });

  const { todayStr, yearStartStr, monthStr } = getLtDateStrings();
  const syncedResults = [];

  for (const secretDoc of secretSnap.docs) {
    const sec = secretDoc.data();
    const apiToken = sec.apiToken;
    const baseUrl = (sec.serverUri || DEFAULT_GROWATT_BASE).replace(/\/+$/, "");

    if (!apiToken) continue;

    const headers = {
      token: apiToken,
      Accept: "application/json",
    };

    const listRes = await axios.get(`${baseUrl}/v1/plant/list`, { headers, timeout: 12000 });
    if (listRes.data?.error_code && listRes.data.error_code !== 0) {
      throw new Error(`Growatt API klaida (${listRes.data.error_code}): ${listRes.data.error_msg || "Nepavyko"}`);
    }

    const plants = listRes.data?.data?.plants || [];
    if (plants.length === 0) {
      throw new Error("Growatt paskyroje nerasta nė vienos elektrinės.");
    }

    for (let idx = 0; idx < plants.length; idx++) {
      const plant = plants[idx];
      const plantId = String(plant.plant_id || plant.id);

      let plantDetail = {};
      let deviceInfoList = [];
      let monthKwh = 0;
      let yearKwh = 0;

      const [detRes, devRes, yearRes] = await Promise.allSettled([
        axios.get(`${baseUrl}/v1/plant/data?plant_id=${encodeURIComponent(plantId)}`, { headers, timeout: 10000 }),
        axios.get(`${baseUrl}/v1/device/list?plant_id=${encodeURIComponent(plantId)}`, { headers, timeout: 10000 }),
        axios.get(`${baseUrl}/v1/plant/energy?plant_id=${encodeURIComponent(plantId)}&start_date=${yearStartStr}&end_date=${todayStr}&time_unit=month`, { headers, timeout: 10000 }),
      ]);

      if (detRes.status === "fulfilled" && detRes.value.data?.error_code === 0) {
        plantDetail = detRes.value.data?.data || {};
      }
      if (devRes.status === "fulfilled" && devRes.value.data?.error_code === 0) {
        deviceInfoList = devRes.value.data?.data?.devices || [];
      }
      if (yearRes.status === "fulfilled" && yearRes.value.data?.error_code === 0) {
        const energys = yearRes.value.data?.data?.energys || [];
        energys.forEach((item) => {
          const val = parseFloat(item.energy || 0);
          yearKwh += val;
          if (String(item.date || "").startsWith(monthStr)) {
            monthKwh += val;
          }
        });
      }

      const rawPowerW = Number(plantDetail.current_power ?? plant.current_power ?? 0);
      const currentPowerW = Math.round(rawPowerW);
      const currentPowerKw = parseFloat((currentPowerW / 1000).toFixed(2));
      const todayKwh = parseFloat(Number(plantDetail.today_energy ?? plant.today_energy ?? 0).toFixed(2));
      const totalKwh = parseFloat(Number(plantDetail.total_energy ?? plant.total_energy ?? 0).toFixed(1));
      const apiPeakKwp = parseFloat(Number(plant.peak_power ?? plantDetail.peak_power_actual ?? 0).toFixed(2));

      let targetDocId = `growatt_${userId}_${plantId}`;
      let prevData = existingByPlantId[plantId];

      if (!prevData && idx === 0 && legacySolarDocs.length > 0) {
        prevData = legacySolarDocs[0];
        targetDocId = prevData.docId;
      }

      const prevCfg = prevData?.config || {};
      const defaultPanelsKwp = apiPeakKwp > 0 ? apiPeakKwp : (idx === 0 ? 6.5 : 8.3);
      const defaultInverterKw = idx === 0 ? 15.0 : 10.0;

      const finalPanelsKwp = Number(prevCfg.panelsKwp ?? defaultPanelsKwp);
      const finalInverterKw = Number(prevCfg.inverterKw ?? defaultInverterKw);

      const firstDev = deviceInfoList[0] || {};
      const devSn = firstDev.device_sn || firstDev.sn || "";
      const isHybrid =
        String(firstDev.type || "").toLowerCase().includes("sph") ||
        String(firstDev.type || "").toLowerCase().includes("mod") ||
        String(plant.name || "").toLowerCase().includes("hybr") ||
        idx === 1;

      const modelLabel =
        firstDev.model ||
        (isHybrid
          ? `Growatt ${finalInverterKw}kW Hybrid (${finalPanelsKwp}kWp)`
          : `Growatt ${finalInverterKw}kW (${finalPanelsKwp}kWp)`);

      const docPayload = {
        id: targetDocId,
        userId: userId,
        type: "solar",
        brand: "growatt",
        name: prevData?.name || `Saulės elektrinė: ${plant.name || `#${idx + 1}`}`,
        config: {
          panelsKwp: finalPanelsKwp,
          inverterKw: finalInverterKw,
          surplusThresholdKw: Number(prevCfg.surplusThresholdKw ?? 1.5),
          lat: Number(prevCfg.lat ?? plant.latitude ?? 55.2885),
          lng: Number(prevCfg.lng ?? plant.longitude ?? 23.9745),
        },
        telemetry: {
          plantId: plantId,
          plantName: plant.name || `Elektrinė #${idx + 1}`,
          deviceSn: devSn,
          modelInfo: modelLabel,
          currentPowerW: currentPowerW,
          currentPowerKw: currentPowerKw,
          todayKwh: todayKwh,
          monthKwh: parseFloat(monthKwh.toFixed(1)),
          yearKwh: parseFloat(yearKwh.toFixed(1)),
          totalKwh: totalKwh,
          isOnline: Number(plant.status) !== 0,
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
 * Grąžina ShinePhone stiliaus grafikus pasirinktai elektrinei:
 * 1) Šiandienos galios kreivė (/v1/plant/power)
 * 2) Šio mėnesio dienos kWh (/v1/plant/energy?time_unit=day)
 * 3) Šių metų mėnesiai kWh (/v1/plant/energy?time_unit=month)
 */
const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getGrowattChartsData(db, userId, plantId) {
  if (!userId || !plantId) throw new Error("Trūksta userId arba plantId.");

  const secretSnap = await db.collection("growatt_secrets").where("userId", "==", userId).get();
  if (secretSnap.empty) throw new Error("Growatt raktas nerastas.");

  const sec = secretSnap.docs[0].data();
  const apiToken = sec.apiToken;
  const baseUrl = (sec.serverUri || DEFAULT_GROWATT_BASE).replace(/\/+$/, "");

  const headers = { token: apiToken, Accept: "application/json" };
  const { todayStr, yearStartStr, monthStr } = getLtDateStrings();

  const d7 = new Date();
  d7.setDate(d7.getDate() - 6);
  const last7Str = d7.toLocaleDateString("lt-LT", {
    timeZone: "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const debugLog = {};
  let todayPowers = [];
  let monthDays = [];
  let yearMonths = [];

  // 1. Pirmiausia nuskaitome Šiandienos galios kreivę (/v1/plant/power)
  try {
    let pRes = await axios.get(`${baseUrl}/v1/plant/power?plant_id=${encodeURIComponent(plantId)}&date=${todayStr}`, { headers, timeout: 10000 });
    if (pRes.data?.error_code === 10012) {
      await sleepMs(1800);
      pRes = await axios.get(`${baseUrl}/v1/plant/power?plant_id=${encodeURIComponent(plantId)}&date=${todayStr}`, { headers, timeout: 10000 });
    }
    debugLog.power = { code: pRes.data?.error_code, msg: pRes.data?.error_msg, count: pRes.data?.data?.powers?.length || 0 };
    if (pRes.data?.error_code === 0) {
      todayPowers = (pRes.data?.data?.powers || []).map((p) => ({
        time: String(p.time || "").slice(11, 16) || p.time,
        powerW: Math.round(Number(p.power || 0)),
      }));
    }
  } catch (e) {
    debugLog.powerErr = e.message;
  }

  await sleepMs(1200);

  // 2. Paskutinių 7 dienų stulpeliai (/v1/plant/energy?time_unit=day)
  try {
    let mRes = await axios.get(`${baseUrl}/v1/plant/energy?plant_id=${encodeURIComponent(plantId)}&start_date=${last7Str}&end_date=${todayStr}&time_unit=day`, { headers, timeout: 10000 });
    if (mRes.data?.error_code === 10012) {
      await sleepMs(1800);
      mRes = await axios.get(`${baseUrl}/v1/plant/energy?plant_id=${encodeURIComponent(plantId)}&start_date=${last7Str}&end_date=${todayStr}&time_unit=day`, { headers, timeout: 10000 });
    }
    debugLog.monthDays7 = { code: mRes.data?.error_code, msg: mRes.data?.error_msg, count: mRes.data?.data?.energys?.length || 0 };
    if (mRes.data?.error_code === 0) {
      monthDays = (mRes.data?.data?.energys || []).map((e) => ({
        date: e.date,
        label: String(e.date || "").slice(5, 10), // pvz. "11-23"
        kwh: parseFloat(Number(e.energy || 0).toFixed(2)),
      }));
    }
  } catch (e) {
    debugLog.monthErr = e.message;
  }

  await sleepMs(1200);

  // 3. Šių metų 12 mėnesių stulpeliai (/v1/plant/energy?time_unit=month)
  try {
    let yRes = await axios.get(`${baseUrl}/v1/plant/energy?plant_id=${encodeURIComponent(plantId)}&start_date=${yearStartStr}&end_date=${todayStr}&time_unit=month`, { headers, timeout: 10000 });
    if (yRes.data?.error_code === 10012) {
      await sleepMs(1800);
      yRes = await axios.get(`${baseUrl}/v1/plant/energy?plant_id=${encodeURIComponent(plantId)}&start_date=${yearStartStr}&end_date=${todayStr}&time_unit=month`, { headers, timeout: 10000 });
    }
    debugLog.yearMonths = { code: yRes.data?.error_code, msg: yRes.data?.error_msg, count: yRes.data?.data?.energys?.length || 0 };

    if (yRes.data?.error_code === 0) {
      const ltMonths = ["Sau", "Vas", "Kov", "Bal", "Geg", "Bir", "Lie", "Rgp", "Rgs", "Spa", "Lap", "Grd"];
      yearMonths = (yRes.data?.data?.energys || []).map((e) => {
        const mIdx = parseInt(String(e.date || "").slice(5, 7), 10) - 1;
        return {
          date: e.date,
          label: ltMonths[mIdx] || e.date,
          kwh: parseFloat(Number(e.energy || 0).toFixed(1)),
        };
      });
    }
  } catch (e) {
    debugLog.yearErr = e.message;
  }

  // Tikra šio mėnesio suma iš yearMonths (pvz., 168 kWh už visą lapkritį!)
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
    debugLog,
  };
}

async function executeHourlyGrowattSync(db, admin) {
  console.log("☀️ Vykdomas kasvalandinis Growatt saulės elektrinių atnaujinimas...");
  try {
    const snap = await db.collection("growatt_secrets").get();
    const userIds = new Set();
    snap.forEach((doc) => {
      const uid = doc.data()?.userId;
      if (uid) userIds.add(uid);
    });

    for (const uid of userIds) {
      try {
        const res = await syncUserGrowattTelemetry(db, admin, uid);
        console.log(`✅ Growatt atnaujinta vartotojui ${uid} (${res.length} elektrinės)`);
      } catch (e) {
        console.warn(`⚠️ Growatt klaida vartotojui ${uid}:`, e.message);
      }
    }
  } catch (err) {
    console.error("❌ Growatt kasvalandinio ciklo klaida:", err.message);
  }
}

module.exports = {
  syncUserGrowattTelemetry,
  getGrowattChartsData,
  executeHourlyGrowattSync,
};