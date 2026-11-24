// functions/relayRulesEngine.js
const axios = require("axios");
const { syncUserShellyTelemetry } = require("./shellySync");

function cleanServerUri(uri) {
  let clean = (uri || "https://shelly-103-eu.shelly.cloud").trim().replace(/\/+$/, "");
  if (!clean.startsWith("http")) clean = "https://" + clean;
  return clean;
}

/**
 * Siunčia ON / OFF arba Impulso / Laikmačio (timerSec) komandą į Shelly relę
 */
async function sendShellyRelayCommand(db, admin, userId, cmd) {
  const deviceDocId = cmd.deviceDocId;
  const secretDoc = await db.collection("shelly_secrets").doc(deviceDocId).get();
  if (!secretDoc.exists) throw new Error("Nerasti Shelly Cloud raktai.");

  const { serverUri, authKey, shellyDeviceId } = secretDoc.data();
  const baseUrl = cleanServerUri(serverUri);
  const turnVal = cmd.fanOnOff === "on" || cmd.turn === "on" ? "on" : "off";

  const paramsObj = {
    id: shellyDeviceId,
    auth_key: authKey,
    channel: "0",
    turn: turnVal,
  };

  // Aparatinis Shelly laikmatis / impulsas sekundėmis (pvz., 2 sek. vartams arba 1800 sek. siurbliui)
  if (cmd.timerSec && Number(cmd.timerSec) > 0) {
    paramsObj.timer = String(Math.round(Number(cmd.timerSec)));
  }

  const params = new URLSearchParams(paramsObj);

  await axios.post(`${baseUrl}/device/relay/control`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  });

  await new Promise((r) => setTimeout(r, 1500));
  return await syncUserShellyTelemetry(db, admin, userId, deviceDocId);
}

/**
 * Siunčia Push pranešimą į vartotojo telefoną (perkrovos arba baigto darbo atveju)
 */
async function sendRelayPushAlert(db, admin, userId, title, body) {
  try {
    const uDoc = await db.collection("users").doc(userId).get();
    const tokens = uDoc.data()?.fcmTokens || (uDoc.data()?.fcmToken ? [uDoc.data().fcmToken] : []);
    if (!tokens || tokens.length === 0) return;

    await Promise.allSettled(
      tokens.map((tok) =>
        admin.messaging().send({
          token: tok,
          notification: { title, body },
          webpush: {
            notification: { title, body, icon: "https://jurgisagro.com/logo.png" },
            fcmOptions: { link: "https://jurgisagro.com/ismanieji-irenginiai" },
          },
        })
      )
    );
  } catch (e) {}
}

/**
 * Įvertina visas vartotojo nustatytas taisykles (🔴 1 lygis Griežtos + 🟡 2 lygis IR/ARBA)
 */
function evaluateRelayRules(cfg, ctx) {
  const rules = cfg.rules || {};
  const logicMode = cfg.logicMode === "OR" ? "OR" : "AND";

  const strictChecks = [];
  const normalChecks = [];

  const registerRule = (isStrict, passed, reasonOk, reasonFail) => {
    const item = { passed, reason: passed ? reasonOk : reasonFail };
    if (isStrict) strictChecks.push(item);
    else normalChecks.push(item);
  };

  // 1. Savaitinis 7x24 tvarkaraštis (Pr=1 ... Sk=7)
  if (rules.schedule?.enabled) {
    const dayHours = rules.schedule.days?.[String(ctx.weekday1to7)] || [];
    const ok = dayHours.includes(ctx.hourInt);
    registerRule(
      !!rules.schedule.isStrict,
      ok,
      `Tvarkaraštis (${ctx.hourInt}:00 aktyvi)`,
      `Tvarkaraštis (${ctx.hourInt}:00 išjungta)`
    );
  }

  // 2. Šviesu / Sutemus (Saulėtekis / Saulėlydis)
  if (rules.daylight?.enabled) {
    const wantDark = rules.daylight.mode === "dark";
    const ok = wantDark ? !ctx.isDay : ctx.isDay;
    registerRule(
      !!rules.daylight.isStrict,
      ok,
      wantDark ? "Lauke tamsu (sutemus)" : "Lauke šviesu (diena)",
      wantDark ? "Lauke dar šviesu" : "Lauke jau tamsu"
    );
  }

  // 3. Krituliai (Lietus / Sniegas)
  if (rules.precip?.enabled) {
    const c = rules.precip.condition || "no_rain";
    let ok = true;
    if (c === "no_rain") ok = ctx.rainMm <= 0.05;
    else if (c === "rain") ok = ctx.rainMm > 0.05;
    else if (c === "snow") ok = ctx.snowCm > 0.05;
    else if (c === "no_snow") ok = ctx.snowCm <= 0.05;
    registerRule(
      !!rules.precip.isStrict,
      ok,
      `Krituliai atitinka (${c})`,
      `Kritulių draudimas (${c}: lietus ${ctx.rainMm}mm, sniegas ${ctx.snowCm}cm)`
    );
  }

  // 4. Lauko oro temperatūra
  if (rules.temp?.enabled) {
    const limit = Number(rules.temp.valueC ?? 0);
    const ok = rules.temp.op === "gt" ? ctx.airTemp > limit : ctx.airTemp < limit;
    registerRule(
      !!rules.temp.isStrict,
      ok,
      `Temperatūra ${ctx.airTemp}°C (${rules.temp.op === "gt" ? ">" : "<"} ${limit}°C)`,
      `Temperatūra ${ctx.airTemp}°C neatitinka ${rules.temp.op === "gt" ? ">" : "<"} ${limit}°C`
    );
  }

  // 5. Lauko oro drėgmė (RH %)
  if (rules.humidity?.enabled) {
    const limit = Number(rules.humidity.valuePct ?? 70);
    const ok = rules.humidity.op === "gt" ? ctx.rh > limit : ctx.rh < limit;
    registerRule(
      !!rules.humidity.isStrict,
      ok,
      `Drėgmė ${ctx.rh}% (${rules.humidity.op === "gt" ? ">" : "<"} ${limit}%)`,
      `Drėgmė ${ctx.rh}% neatitinka ${rules.humidity.op === "gt" ? ">" : "<"} ${limit}%`
    );
  }

  // 6. Nord Pool kainos riba (< X ct arba > X ct)
  if (rules.priceLimit?.enabled) {
    const limit = Number(rules.priceLimit.maxCt ?? 10);
    const ok = rules.priceLimit.op === "gt" ? ctx.priceCt > limit : ctx.priceCt <= limit;
    registerRule(
      !!rules.priceLimit.isStrict,
      ok,
      `Nord Pool ${ctx.priceCt} ct (${rules.priceLimit.op === "gt" ? ">" : "≤"} ${limit} ct)`,
      `Nord Pool ${ctx.priceCt} ct neatitinka ribos (${limit} ct)`
    );
  }

  // 7. Nord Pool „N pigiausių valandų per parą“
  if (rules.cheapestHours?.enabled) {
    const n = Math.max(1, Math.min(24, Number(rules.cheapestHours.count ?? 4)));
    const sorted = [...ctx.todayHours].sort((a, b) => a.priceCtNoVat - b.priceCtNoVat);
    const topHours = sorted.slice(0, n).map((h) => h.hour);
    const ok = topHours.includes(ctx.hourInt);
    registerRule(
      !!rules.cheapestHours.isStrict,
      ok,
      `Patenka į ${n} pigiausias paros val. (${ctx.priceCt} ct)`,
      `Nepatenka į ${n} pigiausias paros val.`
    );
  }

  // 🔴 1 LYGIS: GRIEŽTOS TAISYKLĖS (jei bent viena neįvykdyta -> BLOKUOJA!)
  const failedStrict = strictChecks.find((c) => !c.passed);
  if (failedStrict) {
    return { shouldBeOn: false, reason: `🔴 Griežtas blokavimas: ${failedStrict.reason}` };
  }

  // 🟡 2 LYGIS: DARBINĖS TAISYKLĖS (IR / ARBA)
  if (normalChecks.length === 0) {
    if (strictChecks.length > 0) {
      return { shouldBeOn: true, reason: `🟢 Visos griežtos sąlygos tenkinamos` };
    }
    return { shouldBeOn: false, reason: "Nėra aktyvių taisyklių" };
  }

  if (logicMode === "OR") {
    const matched = normalChecks.find((c) => c.passed);
    return {
      shouldBeOn: !!matched,
      reason: matched ? `🟢 Suveikė (ARBA): ${matched.reason}` : `⚪ Nė viena taisyklė nesuveikė`,
    };
  } else {
    const failedNormal = normalChecks.find((c) => !c.passed);
    return {
      shouldBeOn: !failedNormal,
      reason: !failedNormal
        ? `🟢 Visos sąlygos (IR) sutapo`
        : `⚪ Netenkina (IR): ${failedNormal.reason}`,
    };
  }
}

/**
 * ⏰ AUTOMATINIS SHELLY IŠMANIŲJŲ RELIŲ TAISYKLIŲ CIKLAS (kas 15 min.)
 */
async function executeSmartRelaysAutopilot(db, admin) {
  console.log("⚡ Vykdomas Shelly Išmaniųjų Relių taisyklių tikrinimas...");

  const snap = await db.collection("user_smart_devices").where("type", "==", "smart_relay").get();
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
  const hourInt = parseInt(
    now.toLocaleTimeString("en-GB", { timeZone: "Europe/Vilnius", hour: "2-digit", hour12: false }),
    10
  );

  // Savaitės diena Lietuvoje (1 = Pirmadienis ... 7 = Sekmadienis)
  const ltDayShort = now.toLocaleDateString("en-US", { timeZone: "Europe/Vilnius", weekday: "short" });
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday1to7 = dayMap[ltDayShort] || 1;

  const todayHours = allHours.filter((h) => h.date === todayStr);
  const currentElecObj = todayHours.find((h) => h.hour === hourInt);
  const priceCt = currentElecObj ? currentElecObj.priceCtNoVat : 15.0;

  await Promise.allSettled(
    snap.docs.map(async (doc) => {
      const dev = doc.data();
      const cfg = dev.config || {};
      const userId = dev.userId;

      let tel = dev.telemetry || {};
      try {
        tel = await syncUserShellyTelemetry(db, admin, userId, dev.id);
      } catch (e) {
        console.warn(`⚠️ Nepavyko nuskaityti relės (${dev.name}):`, e.message);
        return;
      }

      const pg = cfg.powerGuard || {};
      const powerW = Number(tel.powerW || 0);
      const isCurrentlyOn = tel.fanOnOff === "on";

      // 🔴 1. PERKROVOS APSAUGA (visada veikia, net jei autopilotas išjungtas!)
      if (pg.overloadEnabled && isCurrentlyOn && powerW > Number(pg.overloadW || 2500)) {
        await sendShellyRelayCommand(db, admin, userId, { deviceDocId: dev.id, turn: "off" });
        await sendRelayPushAlert(
          db,
          admin,
          userId,
          `🚨 PERKROVA: ${dev.name}`,
          `Relė skubiai išjungta! Užfiksuota ${powerW} W galia (riba ${pg.overloadW} W).`
        );
        await doc.ref.update({ "telemetry.lastRuleDecision": `🚨 Perkrova ${powerW} W -> IŠJUNGTA` });
        return;
      }

      // 🔌 2. BAIGTO DARBO APTIKIMAS (kai galia < idleW)
      if (pg.idleEnabled && isCurrentlyOn) {
        const idleLimitW = Number(pg.idleW || 15);
        const idleMin = Number(pg.idleMin || 10);
        if (powerW < idleLimitW) {
          const lowSince = dev.lowPowerSinceTs || Date.now();
          if (!dev.lowPowerSinceTs) {
            await doc.ref.update({ lowPowerSinceTs: lowSince });
          } else if (Date.now() - lowSince >= idleMin * 60 * 1000) {
            await sendShellyRelayCommand(db, admin, userId, { deviceDocId: dev.id, turn: "off" });
            await doc.ref.update({
              lowPowerSinceTs: null,
              "telemetry.lastRuleDecision": `✅ Darbas baigtas (< ${idleLimitW} W) -> IŠJUNGTA`,
            });
            await sendRelayPushAlert(
              db,
              admin,
              userId,
              `✅ Darbas baigtas: ${dev.name}`,
              `Galia laikėsi žemiau ${idleLimitW} W ilgiau nei ${idleMin} min. Relė automatiškai išjungta.`
            );
            return;
          }
        } else if (dev.lowPowerSinceTs) {
          await doc.ref.update({ lowPowerSinceTs: null });
        }
      }

      if (!cfg.autopilotEnabled) return;

      // 3. Nuskaitome relės GPS vietos orus (Open-Meteo)
      const lat = Number(cfg.lat || 55.2885);
      const lng = Number(cfg.lng || 23.9745);
      let airTemp = 10;
      let rh = 70;
      let rainMm = 0;
      let snowCm = 0;
      let isDay = hourInt >= 7 && hourInt <= 20;

      try {
        const wRes = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,rain,snowfall&timezone=Europe%2FVilnius`,
          { timeout: 6000 }
        );
        const cur = wRes.data?.current;
        if (cur) {
          airTemp = Number(cur.temperature_2m ?? 10);
          rh = Number(cur.relative_humidity_2m ?? 70);
          rainMm = Number(cur.rain ?? 0);
          snowCm = Number(cur.snowfall ?? 0);
          isDay = Number(cur.is_day) === 1;
        }
      } catch (wErr) {}

      const decision = evaluateRelayRules(cfg, {
        weekday1to7,
        hourInt,
        isDay,
        airTemp,
        rh,
        rainMm,
        snowCm,
        priceCt,
        todayHours,
      });

      const targetTurn = decision.shouldBeOn ? "on" : "off";
      if (tel.fanOnOff !== targetTurn) {
        const timerSec = targetTurn === "on" && cfg.autoOffMin?.enabled ? Number(cfg.autoOffMin.minutes || 30) * 60 : 0;
        await sendShellyRelayCommand(db, admin, userId, {
          deviceDocId: dev.id,
          turn: targetTurn,
          timerSec,
        });
      }

      await doc.ref.update({
        "telemetry.lastRuleDecision": decision.reason,
      });
    })
  );
}

module.exports = {
  sendShellyRelayCommand,
  executeSmartRelaysAutopilot,
};