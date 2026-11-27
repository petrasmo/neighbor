// functions/elektrines/solarHub.js
const {
  syncUserGrowattTelemetry,
  getGrowattChartsData,
  executeHourlyGrowattSync,
} = require("./growattSync");

const {
  syncUserFoxEssTelemetry,
  getFoxEssChartsData,
  controlFoxEssBattery,
  executeHourlyFoxEssSyncAndAutopilot,
} = require("./foxessSync");

async function connectSolarInverter(db, admin, body) {
  const { brand = "growatt", userId, apiToken, serverUri } = body || {};
  if (!userId || !apiToken) {
    throw new Error("Trūksta userId arba API rakto (Token).");
  }

  const cleanToken = String(apiToken).trim();

  if (brand === "foxess") {
    const secretDocId = `foxess_${userId.slice(0, 6)}_${cleanToken.slice(0, 10)}`;
    await db.collection("foxess_secrets").doc(secretDocId).set({
      userId,
      apiToken: cleanToken,
      serverUri: String(serverUri || "https://www.foxesscloud.com").trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const plants = await syncUserFoxEssTelemetry(db, admin, userId);
    return { brand: "foxess", count: plants.length, plants };
  }

  const secretDocId = `growatt_${userId.slice(0, 6)}_${cleanToken.slice(0, 10)}`;
  await db.collection("growatt_secrets").doc(secretDocId).set({
    userId,
    apiToken: cleanToken,
    serverUri: String(serverUri || "https://openapi.growatt.com").trim(),
    username: "",
    password: "",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const plants = await syncUserGrowattTelemetry(db, admin, userId);
  return { brand: "growatt", count: plants.length, plants };
}

async function refreshSolarStatusByDevice(db, admin, userId, deviceDocId) {
  if (!userId) throw new Error("Trūksta userId.");

  let brand = "growatt";
  if (deviceDocId) {
    const devDoc = await db.collection("user_smart_devices").doc(deviceDocId).get();
    if (devDoc.exists) brand = devDoc.data()?.brand || "growatt";
  }

  if (brand === "foxess") {
    const plants = await syncUserFoxEssTelemetry(db, admin, userId);
    return { brand, count: plants.length, plants };
  }

  const plants = await syncUserGrowattTelemetry(db, admin, userId);
  return { brand: "growatt", count: plants.length, plants };
}

async function getSolarChartsByDevice(db, userId, deviceDocId) {
  if (!userId || !deviceDocId) throw new Error("Trūksta userId arba deviceDocId.");

  const devDoc = await db.collection("user_smart_devices").doc(deviceDocId).get();
  if (!devDoc.exists) throw new Error("Elektrinė nerasta.");

  const dev = devDoc.data();
  const brand = dev.brand || "growatt";

  if (brand === "foxess") {
    return await getFoxEssChartsData(db, userId, dev.telemetry?.deviceSn || dev.telemetry?.plantId);
  }
  return await getGrowattChartsData(db, userId, dev.telemetry?.plantId || dev.telemetry?.deviceSn);
}

async function controlSolarBatteryByDevice(db, admin, userId, deviceDocId, action) {
  const devDoc = await db.collection("user_smart_devices").doc(deviceDocId).get();
  if (!devDoc.exists) throw new Error("Elektrinė nerasta.");
  const brand = devDoc.data()?.brand || "growatt";

  if (brand === "foxess") {
    return await controlFoxEssBattery(db, admin, userId, deviceDocId, action);
  }
  throw new Error(`Gamintojas „${brand}“ kol kas nepalaiko nuotolinio baterijos valdymo.`);
}

async function executeHourlyAllSolarSync(db, admin) {
  await executeHourlyGrowattSync(db, admin);
  await executeHourlyFoxEssSyncAndAutopilot(db, admin);
}

module.exports = {
  connectSolarInverter,
  refreshSolarStatusByDevice,
  getSolarChartsByDevice,
  controlSolarBatteryByDevice,
  executeHourlyAllSolarSync,
  syncUserGrowattTelemetry,
  getGrowattChartsData,
};