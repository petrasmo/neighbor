// functions/jurgisGpsSync.js

function calcStepMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Įrašo judančio traktoriaus tašką į nemokamą Firebase Storage JSON failą (tractor_tracks/{imei}/{YYYY-MM}.json)
 * ir išvalo smulkius taškus iš senesnių nei 90 dienų failų (palikdamas tik dienos suvestines!)
 */
async function appendTrackPointToStorage(admin, imei, { nowMs, lat, lng, speedKmh, stepDistKm, stepHours }) {
  try {
    const bucket = admin.storage().bucket();
    const dt = new Date(nowMs);
    const todayStr = dt.toLocaleDateString("lt-LT", {
      timeZone: "Europe/Vilnius",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }); // YYYY-MM-DD
    const monthStr = todayStr.slice(0, 7); // YYYY-MM
    const filePath = `tractor_tracks/${imei}/${monthStr}.json`;
    const file = bucket.file(filePath);

    let monthData = { imei, month: monthStr, daysSummary: {}, points: [] };

    const [exists] = await file.exists();
    if (exists) {
      try {
        const [content] = await file.download();
        const parsed = JSON.parse(content.toString("utf-8"));
        if (parsed) monthData = parsed;
      } catch (e) {}
    }

    if (!monthData.daysSummary) monthData.daysSummary = {};
    if (!Array.isArray(monthData.points)) monthData.points = [];

    // 1. Atnaujiname dienos suvestinę (ji lieka visam laikui net ir po 90 dienų!)
    if (!monthData.daysSummary[todayStr]) {
      monthData.daysSummary[todayStr] = { distanceKm: 0, engineHours: 0, pointsCount: 0 };
    }
    const daySum = monthData.daysSummary[todayStr];
    daySum.distanceKm = parseFloat((Number(daySum.distanceKm || 0) + stepDistKm).toFixed(2));
    daySum.engineHours = parseFloat((Number(daySum.engineHours || 0) + stepHours).toFixed(3));
    daySum.pointsCount = Number(daySum.pointsCount || 0) + 1;

    // 2. Pridedame kompaktišką GPS tašką: [timestampSec, lat, lng, speedKmh] (~25 baitai)
    monthData.points.push([
      Math.floor(nowMs / 1000),
      Number(lat.toFixed(6)),
      Number(lng.toFixed(6)),
      Number(speedKmh.toFixed(1)),
    ]);

    // Apsauga: vieno mėnesio faile laikome iki 25 000 taškų (~0.7 MB)
    if (monthData.points.length > 25000) {
      monthData.points = monthData.points.slice(-25000);
    }

    monthData.updatedAt = dt.toISOString();

    await file.save(JSON.stringify(monthData), {
      contentType: "application/json",
      resumable: false,
    });

    // 3. Kartą per parą (kai sukuriamas pirmas dienos taškas) patikriname ir išvalome >90 d. senumo smulkius taškus
    if (daySum.pointsCount === 1) {
      cleanupOldTracksInStorage(bucket, imei, nowMs).catch(() => {});
    }
  } catch (err) {
    console.warn(`⚠️ Storage įrašymo įspėjimas (${imei}):`, err.message);
  }
}

async function cleanupOldTracksInStorage(bucket, imei, nowMs) {
  const cutoffDate = new Date(nowMs - 90 * 24 * 3600 * 1000);
  const cutoffMonthStr = cutoffDate.toISOString().slice(0, 7); // YYYY-MM

  const [files] = await bucket.getFiles({ prefix: `tractor_tracks/${imei}/` });
  for (const f of files) {
    const fileName = f.name.split("/").pop().replace(".json", ""); // YYYY-MM
    if (fileName < cutoffMonthStr) {
      try {
        const [content] = await f.download();
        const parsed = JSON.parse(content.toString("utf-8"));
        // Jei faile dar yra smulkių points – juos išvalome, bet paliekame daysSummary (km ir moto-valandas)!
        if (parsed && Array.isArray(parsed.points) && parsed.points.length > 0) {
          parsed.points = [];
          parsed.trimmedAfter90Days = true;
          await f.save(JSON.stringify(parsed), { contentType: "application/json", resumable: false });
          console.log(`🧹 [90 d. Valymas] Išvalyti smulkūs taškai iš ${f.name}, dienos suvestinės paliktos.`);
        }
      } catch (e) {}
    }
  }
}

/**
 * Užregistruoja naują JurgisAgro GPS trekerį (pvz. Belarus MTZ-82.1 su IMEI kodu)
 */
async function registerJurgisGpsTracker(db, admin, body) {
  const { userId, name, model, category, imei, engineHours } = body || {};
  if (!userId || !imei || !name) {
    throw new Error("Nurodykite traktoriaus pavadinimą ir trekerio IMEI / ID kodą.");
  }

  const cleanImei = String(imei).trim().replace(/[^a-zA-Z0-9_-]/g, "");
  const docId = `jurgisgps_${cleanImei}`;
  const isComb = category === "combine";

  const payload = {
    id: docId,
    userId: userId,
    type: "jurgis_tractor",
    brand: "jurgis_gps",
    imei: cleanImei,
    name: String(name).trim(),
    model: String(model || (isComb ? "Javų kombainas" : "Belarus MTZ-82.1 (82 AG)")).trim(),
    category: isComb ? "Combine" : "Tractor",
    icon: isComb ? "🌾" : "🚜",
    telemetry: {
      isConnected: true,
      vin: `IMEI-${cleanImei}`,
      engineHours: Number(engineHours || 0),
      distanceKm: 0,
      speedKmh: 0,
      rpm: 0,
      batteryVolts: 12.6,
      fuelLevelPct: 75,
      isWorking: false,
      location: null,
      lastPingAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("user_smart_devices").doc(docId).set(payload, { merge: true });
  return payload;
}

/**
 * Pašalina JurgisAgro GPS trekerį
 */
async function deleteJurgisGpsTracker(db, userId, docId) {
  const ref = db.collection("user_smart_devices").doc(docId);
  const doc = await ref.get();
  if (doc.exists && doc.data().userId === userId) {
    await ref.delete();
  }
  return { deleted: true };
}

/**
 * Priima gyvus GPS taškus, taupo Firestore įrašymus stovint ir archyvuoja maršrutą į Firebase Storage!
 */
async function handleJurgisGpsWebhook(db, admin, req) {
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const query = req.query || {};

  const rawPackets = Array.isArray(body) ? body : [body];
  let updatedCount = 0;

  for (const pkt of rawPackets) {
    const imei = String(pkt.imei || pkt.ident || pkt.device_id || query.id || query.imei || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "");

    const lat = Number(pkt.lat ?? pkt["position.latitude"] ?? pkt.position?.latitude ?? query.lat);
    const lng = Number(pkt.lng ?? pkt.lon ?? pkt["position.longitude"] ?? pkt.position?.longitude ?? query.lon);

    if (!imei || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      continue;
    }

    const speedKmh = Number(pkt.speedKmh ?? pkt["position.speed"] ?? pkt.position?.speed ?? query.speed ?? 0);
    const heading = Number(pkt.heading ?? pkt["position.direction"] ?? pkt.position?.direction ?? query.bearing ?? 0);
    const voltageV = Number(
      pkt.voltageV ?? pkt["external.powersource.voltage"] ?? (pkt.battery ? pkt.battery : 14.1)
    );
    const ignition =
      pkt.ignition !== undefined
        ? !!pkt.ignition
        : pkt["engine.ignition.status"] !== undefined
        ? !!pkt["engine.ignition.status"]
        : speedKmh > 0.5;

    const docId = `jurgisgps_${imei}`;
    const devRef = db.collection("user_smart_devices").doc(docId);
    const devDoc = await devRef.get();
    if (!devDoc.exists) continue;

    const prev = devDoc.data();
    const prevTel = prev.telemetry || {};
    const prevTrail = prevTel.location?.trail || [];
    const lastPt = prevTrail[prevTrail.length - 1];

    const stepMeters = lastPt ? calcStepMeters(lastPt[0], lastPt[1], lat, lng) : 999;
    const moved = stepMeters >= 3.0; // Pajudėjo bent 3 metrus
    const nowMs = Date.now();
    const prevMs = prev.lastIgnitionTimestampMs || nowMs;
    const elapsedMs = Math.max(0, nowMs - prevMs);

    // 🌟 TAUPYMO FILTRAS: Jei traktorius stovi vietoje (<3m), degimas nepasikeitė ir nepraėjo 30 min. -> NERAŠOME į Firestore!
    if (!moved && ignition === !!prevTel.isWorking && elapsedMs < 30 * 60 * 1000) {
      continue;
    }

    const newTrail = moved ? [...prevTrail.slice(-34), [lat, lng]] : prevTrail;
    if (newTrail.length === 0) newTrail.push([lat, lng]);

    const stepHours = ignition && elapsedMs > 0 && elapsedMs < 15 * 60 * 1000 ? elapsedMs / 3600000 : 0;
    const stepDistKm = moved && stepMeters < 5000 ? stepMeters / 1000 : 0;

    const newHours = parseFloat((Number(prevTel.engineHours || 0) + stepHours).toFixed(3));
    const newDistKm = parseFloat((Number(prevTel.distanceKm || 0) + stepDistKm).toFixed(2));

    await devRef.set(
      {
        lastIgnitionTimestampMs: nowMs,
        telemetry: {
          ...prevTel,
          isConnected: true,
          isWorking: ignition,
          speedKmh: parseFloat(speedKmh.toFixed(1)),
          rpm: ignition ? (speedKmh > 2 ? 1750 : 850) : 0,
          batteryVolts: parseFloat(voltageV.toFixed(1)),
          engineHours: newHours,
          distanceKm: newDistKm,
          location: {
            lat,
            lng,
            heading: Math.round(heading),
            timestamp: new Date(nowMs).toISOString(),
            trail: newTrail,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 🌟 Jei traktorius pajudėjo -> įrašome tašką į nemokamą Firebase Storage mėnesio JSON archyvą!
    if (moved) {
      await appendTrackPointToStorage(admin, imei, {
        nowMs,
        lat,
        lng,
        speedKmh,
        stepDistKm,
        stepHours,
      });
    }

    updatedCount++;
  }

  return { success: true, updatedCount };
}

/**
 * Grąžina visus vartotojo JurgisAgro GPS traktorius tuo pačiu formatu kaip John Deere mašinas
 */
async function getUserJurgisGpsMachines(db, userId) {
  if (!userId) return [];
  const snap = await db
    .collection("user_smart_devices")
    .where("userId", "==", userId)
    .where("type", "==", "jurgis_tractor")
    .get();

  const list = [];
  snap.forEach((doc) => {
    const d = doc.data();
    const tel = d.telemetry || {};
    list.push({
      id: d.id,
      imei: d.imei,
      isJurgisGps: true,
      name: d.name || "Belarus MTZ",
      vin: `IMEI: ${d.imei}`,
      make: "JurgisAgro GPS",
      model: d.model || "Belarus MTZ-82.1",
      category: d.category || "Tractor",
      isConnected: true,
      engineHours: Number(tel.engineHours || 0).toFixed(1),
      distanceKm: Number(tel.distanceKm || 0).toFixed(1),
      speedKmh: Number(tel.speedKmh || 0),
      rpm: Number(tel.rpm || 0),
      batteryVolts: Number(tel.batteryVolts || 12.6),
      location: tel.location || null,
    });
  });
  return list;
}

module.exports = {
  registerJurgisGpsTracker,
  deleteJurgisGpsTracker,
  handleJurgisGpsWebhook,
  getUserJurgisGpsMachines,
};