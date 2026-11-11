// functions/shellySync.js
const axios = require("axios");

const CROP_EMC_PARAMS = {
  wheat: { A: 512.4, B: 30.0, C: 0.25 },
  rapeseed: { A: 398.2, B: 25.0, C: 0.38 },
  barley: { A: 480.0, B: 28.0, C: 0.24 },
  peas: { A: 450.0, B: 25.0, C: 0.23 },
  corn: { A: 540.0, B: 30.0, C: 0.24 },
};

function calculateEMC(cropKey, airTempC, rhPercent) {
  const params = CROP_EMC_PARAMS[cropKey] || CROP_EMC_PARAMS.wheat;
  const rh = Math.max(0.05, Math.min(0.98, rhPercent / 100));
  const T = airTempC;
  try {
    const term = -((T + params.B) / params.A) * Math.log(rh);
    if (term <= 0) return 14.0;
    const emc = -(1 / params.C) * Math.log(term);
    return parseFloat(Math.max(5.0, Math.min(26.0, emc)).toFixed(1));
  } catch (e) {
    return 14.0;
  }
}

function cleanServerUri(uri) {
  let clean = (uri || "https://shelly-103-eu.shelly.cloud").trim().replace(/\/+$/, "");
  if (!clean.startsWith("http")) clean = "https://" + clean;
  return clean;
}

/**
 * Nuskaito Shelly 1PM Mini Gen3 (arba bet kurios kitos Shelly relės) būseną iš Shelly Cloud API
 */
async function syncUserShellyTelemetry(db, admin, userId, deviceDocId) {
  const devRef = db.collection("user_smart_devices").doc(deviceDocId);
  const devDoc = await devRef.get();
  if (!devDoc.exists) throw new Error("Bokšto įrenginys nerastas.");

  const dev = devDoc.data();
  const secretRef = db.collection("shelly_secrets").doc(deviceDocId);
  const secretDoc = await secretRef.get();
  if (!secretDoc.exists) throw new Error("Nerasti Shelly Cloud prisijungimo raktai.");

  const { serverUri, authKey, shellyDeviceId } = secretDoc.data();
  const baseUrl = cleanServerUri(serverUri);

  const params = new URLSearchParams({
    id: shellyDeviceId,
    auth_key: authKey,
  });

  const res = await axios.post(`${baseUrl}/device/status`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  });

  const data = res.data;
  if (!data || !data.isok) {
    throw new Error("Shelly Cloud grąžino klaidą (patikrinkite Device ID ir Auth Key).");
  }

  const devStatus = data.data?.device_status || {};
  const isOnline = !!data.data?.online;

  // Gen2 / Gen3 (Shelly 1PM Mini Gen3 naudoja 'switch:0') arba Gen1 ('relays[0]')
  const sw = devStatus["switch:0"] || (devStatus.relays && devStatus.relays[0]) || {};
  const isOn = sw.output === true || sw.ison === true;
  const powerW = Number(sw.apower ?? (devStatus.meters && devStatus.meters[0]?.power) ?? 0);
  const voltageV = Number(sw.voltage ?? devStatus.voltage ?? 230);
  const totalWh = Number(sw.aenergy?.total ?? (devStatus.meters && devStatus.meters[0]?.total ? devStatus.meters[0].total / 60 : 0));
  const totalKwh = parseFloat((totalWh / 1000).toFixed(3));
  const internalTempC = sw.temperature?.tC ?? devStatus.temperature ?? null;

  const telemetry = {
    shellyDeviceId: shellyDeviceId,
    modelInfo: devStatus.sys?.mac ? `Shelly Gen3 (${devStatus.sys.mac.slice(-4)})` : "Shelly 1PM Mini Gen3",
    isOnline: isOnline,
    fanOnOff: isOn ? "on" : "off",
    powerW: parseFloat(powerW.toFixed(1)),
    voltageV: parseFloat(voltageV.toFixed(0)),
    totalKwh: totalKwh,
    deviceTempC: internalTempC,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await devRef.set(
    {
      telemetry: telemetry,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return telemetry;
}

/**
 * Siunčia tiesioginę ON / OFF komandą į Shelly relę
 */
async function sendShellyCommand(db, admin, userId, cmd) {
  const deviceDocId = cmd.deviceDocId;
  const secretDoc = await db.collection("shelly_secrets").doc(deviceDocId).get();
  if (!secretDoc.exists) throw new Error("Nerasti Shelly Cloud raktai.");

  const { serverUri, authKey, shellyDeviceId } = secretDoc.data();
  const baseUrl = cleanServerUri(serverUri);
  const turnVal = cmd.fanOnOff === "on" ? "on" : "off";

  const params = new URLSearchParams({
    id: shellyDeviceId,
    auth_key: authKey,
    channel: "0",
    turn: turnVal,
  });

  await axios.post(`${baseUrl}/device/relay/control`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  });

  // Palaukiame 2 sek., kol relė suklaksės ir atnaujiname būseną
  await new Promise((r) => setTimeout(r, 2000));
  return await syncUserShellyTelemetry(db, admin, userId, deviceDocId);
}

/**
 * ⏰ KASVALANDINIS GRŪDŲ BOKŠTŲ AUTOPILOTAS (EMC + NORD POOL)
 */
async function executeHourlySiloAutopilot(db, admin) {
  console.log("🛢️ Vykdomas kasvalandinis Grūdų Bokštų (Shelly IoT) autopilotas...");

  const snap = await db.collection("user_smart_devices")
    .where("type", "==", "silo_fan")
    .get();

  if (snap.empty) return;

  const elecDoc = await db.collection("electricity_prices").doc("market_data").get();
  const allHours = elecDoc.exists ? elecDoc.data().hours || [] : [];

  const now = new Date();
  const todayStr = now.toLocaleDateString("lt-LT", {
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
  const nowTs = Date.now();

  const currentElecObj = allHours.find((h) => h.date === todayStr && h.hour === currentHourInt);
  const currentPriceCt = currentElecObj ? currentElecObj.priceCtNoVat : 15.0;

  await Promise.allSettled(
    snap.docs.map(async (doc) => {
      const dev = doc.data();
      const cfg = dev.config || {};
      const userId = dev.userId;

      let tel = dev.telemetry || {};
      try {
        tel = await syncUserShellyTelemetry(db, admin, userId, dev.id);
      } catch (e) {
        console.warn(`⚠️ Nepavyko nuskaityti Shelly (${dev.name}):`, e.message);
      }

      const isFullAuto = cfg.autopilotEnabled === true;
      const isManualActive =
        cfg.manualApprovalActive === true &&
        cfg.approvedUntilTimestamp &&
        nowTs <= cfg.approvedUntilTimestamp;

      // Jei autopilotas neaktyvus – išjungiame ventiliatorių (Rollback į OFF)
      if (!isFullAuto && !isManualActive) {
        if (cfg.wasRolledBack !== true) {
          if (tel.fanOnOff === "on") {
            await sendShellyCommand(db, admin, userId, { deviceDocId: dev.id, fanOnOff: "off" });
          }
          await doc.ref.update({
            "config.wasRolledBack": true,
            "config.manualApprovalActive": false,
          });
        }
        return;
      }

      // Nuskaitome bokšto vietos orus iš Open-Meteo
      const lat = cfg.lat || 55.2885;
      const lng = cfg.lng || 23.9745;
      let airTemp = 12.0;
      let rh = 75;

      try {
        const wRes = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m&timezone=Europe%2FVilnius`,
          { timeout: 6000 }
        );
        if (wRes.data?.current) {
          airTemp = wRes.data.current.temperature_2m ?? 12.0;
          rh = wRes.data.current.relative_humidity_2m ?? 75;
        }
      } catch (wErr) {}

      const cropKey = cfg.cropKey || "wheat";
      const grainMoisture = Number(cfg.grainMoisture ?? 14.5);
      const grainTemp = Number(cfg.grainTemp ?? 16.0);
      const maxPriceCt = Number(cfg.maxPriceCt ?? 18.0);
      const modeProfile = cfg.modeProfile || "cooling"; // 'cooling', 'drying', 'manual'

      const currentEmc = calculateEMC(cropKey, airTemp, rh);

      let shouldRunFan = false;

      if (modeProfile === "manual" && cfg.customHours) {
        shouldRunFan = cfg.customHours[currentHourInt]?.fanOnOff === "on";
      } else {
        const isPriceOk = currentPriceCt <= maxPriceCt;
        const isNotWetting = currentEmc <= grainMoisture + 0.3;
        const isCoolingOk = airTemp <= grainTemp - 1.5;
        const isDryingOk = currentEmc <= grainMoisture - 0.3 && airTemp <= grainTemp + 4;

        if (modeProfile === "drying") {
          shouldRunFan = isPriceOk && isDryingOk;
        } else {
          // 'cooling' (Saugus vėsinimas ir palaikymas)
          shouldRunFan = isPriceOk && isNotWetting && isCoolingOk;
        }
      }

      const targetState = shouldRunFan ? "on" : "off";
      if (tel.fanOnOff !== targetState) {
        console.log(`🌪️ [BOKŠTO AUTOPILOTAS] ${dev.name}: keičiama būsena į ${targetState.toUpperCase()} (EMC=${currentEmc}%, Kaina=${currentPriceCt} ct)`);
        await sendShellyCommand(db, admin, userId, {
          deviceDocId: dev.id,
          fanOnOff: targetState,
        });
      }

      if (cfg.wasRolledBack !== false) {
        await doc.ref.update({ "config.wasRolledBack": false });
      }
    })
  );
}

module.exports = {
  syncUserShellyTelemetry,
  sendShellyCommand,
  executeHourlySiloAutopilot,
};