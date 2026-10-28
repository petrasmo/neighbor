// functions/daikinSync.js
const axios = require("axios");

const DAIKIN_CLIENT_ID = "8bpQjHjqoc87VWPCaVeGiXS-";
const DAIKIN_CLIENT_SECRET = "Kb9NU7eLS0VHRBn_lB5wM7dVqU2pToIgKt6G8sn7mtkpPYlXvDCwDoeuB0gzeFD-WlNl6LJrvUI_wcvOhbNVUw";
const REDIRECT_URI = "https://us-central1-neighborpm-b9968.cloudfunctions.net/daikinAuthCallback";

const DAIKIN_AUTH_URL = "https://idp.onecta.daikineurope.com/v1/oidc/authorize";
const DAIKIN_TOKEN_URL = "https://idp.onecta.daikineurope.com/v1/oidc/token";
const DAIKIN_API_BASE = "https://api.onecta.daikineurope.com/v1";

function getDaikinLoginUrl(userId) {
  const state = userId || "default_user";
  const scope = "openid onecta:basic.integration";
  return `${DAIKIN_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(
    DAIKIN_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
}

async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: DAIKIN_CLIENT_ID,
    client_secret: DAIKIN_CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
  });

  const res = await axios.post(DAIKIN_TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  });

  return res.data;
}

async function refreshDaikinTokens(refreshToken) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: DAIKIN_CLIENT_ID,
    client_secret: DAIKIN_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const res = await axios.post(DAIKIN_TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  });

  return res.data;
}

async function getValidAccessToken(db, admin, userId) {
  const secretRef = db.collection("daikin_secrets").doc(userId);
  const secretDoc = await secretRef.get();
  if (!secretDoc.exists) {
    throw new Error("Vartotojas dar neprijungė Daikin paskyros.");
  }

  const data = secretDoc.data();
  const now = Date.now();

  if (data.accessToken && data.expiresAt && now < data.expiresAt - 60000) {
    return data.accessToken;
  }

  const refreshed = await refreshDaikinTokens(data.refreshToken);
  const newAccess = refreshed.access_token;
  const newRefresh = refreshed.refresh_token || data.refreshToken;
  const newExpires = now + (refreshed.expires_in || 3600) * 1000;

  await secretRef.set(
    {
      accessToken: newAccess,
      refreshToken: newRefresh,
      expiresAt: newExpires,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return newAccess;
}

/**
 * Nuskaito VISUS katilo ir boilerio duomenis ir įrašo į kolekciją user_smart_devices
 */
async function syncUserDaikinTelemetry(db, admin, userId) {
  const token = await getValidAccessToken(db, admin, userId);

  const res = await axios.get(`${DAIKIN_API_BASE}/gateway-devices`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    timeout: 10000,
  });

  const devices = res.data || [];
  if (devices.length === 0) {
    throw new Error("Daikin paskyroje nerasta prijungtų šilumos siurblių.");
  }

  const dev = devices[0];
  const deviceId = dev.id || "default_daikin";

  let telemetry = {
    deviceId: deviceId,
    modelInfo: "EHBH08EF9W",
    isOnline: !!dev.isCloudConnectionUp,
    errorCode: "-",
    climateMpId: "climateControlMainZone",
    climateOnOff: "off",
    operationMode: "heating",
    outdoorTemp: null,
    leavingWaterTemp: null,
    roomTemp: null,
    currentOffset: 0,
    dhwMpId: "domesticHotWaterTank",
    dhwOnOff: "off",
    dhwPowerful: "off",
    boilerTemp: null,
    dhwTargetTemp: 30,
  };

  const mps = dev.managementPoints || [];
  mps.forEach((mp) => {
    const mpType = mp.managementPointType || "";
    const embId = String(mp.embeddedId || "");
    const sensory = mp.sensoryData?.value || {};

    if (mpType === "indoorUnitHydro" && mp.modelInfo?.value) {
      telemetry.modelInfo = mp.modelInfo.value;
    }

    if (mpType === "climateControl" || embId === "climateControlMainZone") {
      telemetry.climateMpId = embId;
      telemetry.climateOnOff = mp.onOffMode?.value || "off";
      telemetry.operationMode = mp.operationMode?.value || "heating";
      telemetry.errorCode = mp.errorCode?.value || "-";

      if (sensory.outdoorTemperature?.value !== undefined) {
        telemetry.outdoorTemp = sensory.outdoorTemperature.value;
      }
      if (sensory.leavingWaterTemperature?.value !== undefined) {
        telemetry.leavingWaterTemp = sensory.leavingWaterTemperature.value;
      }
      if (sensory.roomTemperature?.value !== undefined) {
        telemetry.roomTemp = sensory.roomTemperature.value;
      }

      const modeKey = telemetry.operationMode === "cooling" ? "cooling" : "heating";
      const setpoints = mp.temperatureControl?.value?.operationModes?.[modeKey]?.setpoints || {};

      if (setpoints.leavingWaterOffset?.value !== undefined) {
        telemetry.currentOffset = setpoints.leavingWaterOffset.value;
      }
    }

    if (mpType === "domesticHotWaterTank" || embId === "domesticHotWaterTank") {
      telemetry.dhwMpId = embId;
      telemetry.dhwOnOff = mp.onOffMode?.value || "off";
      telemetry.dhwPowerful = mp.powerfulMode?.value || "off";

      if (sensory.tankTemperature?.value !== undefined) {
        telemetry.boilerTemp = sensory.tankTemperature.value;
      }

      const dhwSetpoints = mp.temperatureControl?.value?.operationModes?.heating?.setpoints || {};
      if (dhwSetpoints.domesticHotWaterTemperature?.value !== undefined) {
        telemetry.dhwTargetTemp = dhwSetpoints.domesticHotWaterTemperature.value;
      }
    }
  });

  const deviceDocId = `daikin_${deviceId}`;
  const deviceRef = db.collection("user_smart_devices").doc(deviceDocId);
  const existingDoc = await deviceRef.get();

  const defaultConfig = {
    autopilotEnabled: false,
    manualApprovalActive: false,
    approvedUntilTimestamp: null,
    modeProfile: "unoccupied",
    allowedHoursPerDay: 4,
    maxRoomTempLimit: 16.0,
    cheapHourOffset: -5,
    normalHourAction: "standby",
  };

  // 🌟 PIRMINIŲ NUSTATYMŲ FIKSAVIMAS (TIK 1 KARTĄ, KAI PIRMA KARTĄ PAMATO KATILĄ!)
  let baselineSettings = existingDoc.exists && existingDoc.data().baselineSettings
    ? existingDoc.data().baselineSettings
    : {
        climateOnOff: telemetry.climateOnOff || "off",
        offset: telemetry.currentOffset ?? -10,
        dhwOnOff: telemetry.dhwOnOff || "off",
        capturedAt: admin.firestore.FieldValue.serverTimestamp()
      };

  await deviceRef.set(
    {
      id: deviceDocId,
      userId: userId,
      type: "heatpump",
      brand: "daikin",
      name: existingDoc.exists && existingDoc.data().name ? existingDoc.data().name : "Namo Daikin Altherma 3",
      config: existingDoc.exists && existingDoc.data().config ? existingDoc.data().config : defaultConfig,
      baselineSettings: baselineSettings,
      telemetry: {
        ...telemetry,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return telemetry;
}

/**
 * Siunčia komandą į Daikin katilą
 */
async function sendDaikinCommand(db, admin, userId, cmd) {
  const token = await getValidAccessToken(db, admin, userId);
  const deviceId = cmd.deviceId || "1d086dce-5f96-461c-947b-1b2794c84f3f";
  const climateMpId = "climateControlMainZone";
  const dhwMpId = "domesticHotWaterTank";

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    if (cmd.climateOnOff === "on" || cmd.climateOnOff === "off") {
      await axios.patch(
        `${DAIKIN_API_BASE}/gateway-devices/${deviceId}/management-points/${climateMpId}/characteristics/onOffMode`,
        { value: cmd.climateOnOff },
        { headers, timeout: 10000 }
      );
    }

    if (cmd.offset !== undefined && cmd.offset !== null) {
      await axios.patch(
        `${DAIKIN_API_BASE}/gateway-devices/${deviceId}/management-points/${climateMpId}/characteristics/temperatureControl`,
        {
          path: "/operationModes/heating/setpoints/leavingWaterOffset",
          value: parseInt(cmd.offset, 10),
        },
        { headers, timeout: 10000 }
      );
    }

    if (cmd.dhwOnOff === "on" || cmd.dhwOnOff === "off") {
      await axios.patch(
        `${DAIKIN_API_BASE}/gateway-devices/${deviceId}/management-points/${dhwMpId}/characteristics/onOffMode`,
        { value: cmd.dhwOnOff },
        { headers, timeout: 10000 }
      );
      if (cmd.dhwPowerful === "on") {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (cmd.dhwPowerful === "on" || cmd.dhwPowerful === "off") {
      await axios.patch(
        `${DAIKIN_API_BASE}/gateway-devices/${deviceId}/management-points/${dhwMpId}/characteristics/powerfulMode`,
        { value: cmd.dhwPowerful },
        { headers, timeout: 10000 }
      );
    }
  } catch (apiErr) {
    const daikinMsg = apiErr.response?.data ? JSON.stringify(apiErr.response.data) : apiErr.message;
    throw new Error(`Daikin atmetė komandą: ${daikinMsg}`);
  }

  await new Promise((r) => setTimeout(r, 4500));
  return await syncUserDaikinTelemetry(db, admin, userId);
}

/**
 * 🌟 AUTOMATINIS KASVALANDINIS TIKRINIMAS IR ROLLBACK (ATSTATYMAS Į BAZĘ)
 */
async function executeHourlyDaikinAutopilot(db, admin) {
  console.log("⏰ Vykdomas kasvalandinis Daikin katilų valdymo patikrinimas...");

  const snap = await db.collection("user_smart_devices")
    .where("type", "==", "heatpump")
    .where("brand", "==", "daikin")
    .get();

  if (snap.empty) return;

  const elecDoc = await db.collection("electricity_prices").doc("market_data").get();
  const allHours = elecDoc.exists ? elecDoc.data().hours || [] : [];
  if (allHours.length === 0) return;

  const now = new Date();
  const todayStr = now.toLocaleDateString("lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" });
  const currentHourInt = parseInt(now.toLocaleTimeString("en-GB", { timeZone: "Europe/Vilnius", hour: "2-digit", hour12: false }), 10);
  const nowTs = Date.now();

  // Šiandienos valandos
  const dayHours = allHours.filter((h) => h.date === todayStr);
  const sortedDay = [...dayHours].sort((a, b) => a.priceCtNoVat - b.priceCtNoVat);

  await Promise.allSettled(
    snap.docs.map(async (doc) => {
      const dev = doc.data();
      const cfg = dev.config || {};
      const baseline = dev.baselineSettings || { climateOnOff: "off", offset: -10, dhwOnOff: "off" };
      const userId = dev.userId;

      // 1. TIKRINAME AR GRAFIKAS AKTYVUS (ARBA PILNA AUTOMATIKA, ARBA ŽMOGAUS PATVIRTINTAS GRAFIKAS)
      const isFullAuto = cfg.autopilotEnabled === true;
      const isManualActive = cfg.manualApprovalActive === true && cfg.approvedUntilTimestamp && nowTs <= cfg.approvedUntilTimestamp;

      // 2. JEI GRAFIKAS PASIBAIGĖ ARBA IŠJUNGTAS -> AUTOMATINIS ROLLBACK (ATSTATYMAS Į BAZĘ)!
      if (!isFullAuto && !isManualActive) {
        if (cfg.wasRolledBack !== true) {
          console.log(`↩️ [ROLLBACK] Katilas ${dev.name} pasibaigus grafikui atstatomas į pirminę būseną!`);
          await sendDaikinCommand(db, admin, userId, {
            deviceId: dev.telemetry?.deviceId,
            climateOnOff: baseline.climateOnOff,
            offset: baseline.offset,
            dhwOnOff: baseline.dhwOnOff,
          });
          await doc.ref.update({
            "config.wasRolledBack": true,
            "config.manualApprovalActive": false,
          });
        }
        return;
      }

      // 3. JEI GRAFIKAS AKTYVUS -> VYKDOME DABARTINĖS VALANDOS KOMANDĄ
      const allowedCount = Math.min(24, Math.max(0, cfg.allowedHoursPerDay || 4));
      const cheapHoursSet = new Set(sortedDay.slice(0, allowedCount).map((h) => h.hour));
      const shouldHeatThisHour = cheapHoursSet.has(currentHourInt);

      // Saugiklis: patalpos temperatūros lubos
      const roomTemp = dev.telemetry?.roomTemp;
      const isOverMax = roomTemp !== null && roomTemp !== undefined && roomTemp >= (cfg.maxRoomTempLimit || 16);

      if (shouldHeatThisHour && !isOverMax) {
        console.log(`🔥 [AUTOPILOT] Katilas ${dev.name}: pigi valanda (${currentHourInt}:00), įjungiamas šildymas (offset: ${cfg.cheapHourOffset})`);
        await sendDaikinCommand(db, admin, userId, {
          deviceId: dev.telemetry?.deviceId,
          climateOnOff: "on",
          offset: cfg.cheapHourOffset ?? -5,
        });
      } else {
        const offCmd = cfg.normalHourAction === "offset_minus_10"
          ? { climateOnOff: "on", offset: -10 }
          : (cfg.normalHourAction === "offset_minus_5" ? { climateOnOff: "on", offset: -5 } : { climateOnOff: "off" });

        console.log(`💤 [AUTOPILOT] Katilas ${dev.name}: brangi valanda (${currentHourInt}:00), taikomas poilsis`);
        await sendDaikinCommand(db, admin, userId, {
          deviceId: dev.telemetry?.deviceId,
          ...offCmd,
        });
      }

      await doc.ref.update({ "config.wasRolledBack": false });
    })
  );
}

module.exports = {
  getDaikinLoginUrl,
  exchangeCodeForTokens,
  syncUserDaikinTelemetry,
  sendDaikinCommand,
  executeHourlyDaikinAutopilot,
};