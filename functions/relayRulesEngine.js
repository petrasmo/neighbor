// functions/relayRulesEngine.js
const axios = require("axios");
const { syncUserShellyTelemetry } = require("./shellySync");

function cleanServerUri(uri) {
  let clean = (uri || "https://shelly-103-eu.shelly.cloud").trim().replace(/\/+$/, "");
  if (!clean.startsWith("http")) clean = "https://" + clean;
  return clean;
}

async function sendShellyRelayCommand(db, admin, userId, cmd) {
  const deviceDocId = cmd.deviceDocId;
  const secretDoc = await db.collection("shelly_secrets").doc(deviceDocId).get();
  if (!secretDoc.exists) throw new Error("Nerasti Shelly Cloud raktai.");

  const { serverUri, authKey, shellyDeviceId } = secretDoc.data();
  const baseUrl = cleanServerUri(serverUri);
  const turnVal = cmd.fanOnOff === "on" || cmd.turn === "on" ? "on" : "off";
  const timerSec = Number(cmd.timerSec || 0);

  const paramsObj = { id: shellyDeviceId, auth_key: authKey, channel: "0", turn: turnVal };
  if (timerSec > 0) {
    paramsObj.timer = String(Math.round(timerSec));
  }

  await axios.post(`${baseUrl}/device/relay/control`, new URLSearchParams(paramsObj).toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  });

  // 1. Jei tai trumpas vartų impulsas (1–15 sek.) -> palaukiame ir garantuotai išjungiame Gen3 relę!
  if (turnVal === "on" && timerSec > 0 && timerSec <= 15) {
    await new Promise((r) => setTimeout(r, timerSec * 1000));
    const offParams = new URLSearchParams({ id: shellyDeviceId, auth_key: authKey, channel: "0", turn: "off" });
    await axios.post(`${baseUrl}/device/relay/control`, offParams.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    });
    await db.collection("user_smart_devices").doc(deviceDocId).update({ autoOffAtTimestamp: null }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    return await syncUserShellyTelemetry(db, admin, userId, deviceDocId);
  }

  // 2. Jei tai ilgesnis Auto-OFF laikmatis (pvz. 3 min.) -> išsaugome tikslų išjungimo laiką Firestore!
  const autoOffAt = turnVal === "on" && timerSec > 15 ? Date.now() + timerSec * 1000 : null;
  await db.collection("user_smart_devices").doc(deviceDocId).update({
    autoOffAtTimestamp: autoOffAt,
  }).catch(() => {});

  await new Promise((r) => setTimeout(r, 1500));
  return await syncUserShellyTelemetry(db, admin, userId, deviceDocId);
}

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
          webpush: { notification: { title, body, icon: "https://jurgisagro.com/logo.png" } },
        })
      )
    );
  } catch (e) {}
}

function checkSingleRuleCondition(rule, ctx) {
  const p = rule.params || {};
  switch (rule.type) {
    case "price_limit": {
      const lim = Number(p.maxCt ?? 10);
      const ok = p.op === "gt" ? ctx.priceCt > lim : ctx.priceCt <= lim;
      return { ok, label: `Nord Pool ${ctx.priceCt} ct (${p.op === "gt" ? ">" : "≤"} ${lim} ct)` };
    }
    case "cheapest_hours": {
      const n = Math.max(1, Math.min(24, Number(p.count ?? 4)));
      const top = [...ctx.todayHours].sort((a, b) => a.priceCtNoVat - b.priceCtNoVat).slice(0, n).map((h) => h.hour);
      return { ok: top.includes(ctx.hourInt), label: `Top-${n} pigiausios val.` };
    }
    case "schedule": {
      const hrs = p.days?.[String(ctx.weekday1to7)] || [];
      return { ok: hrs.includes(ctx.hourInt), label: `Tvarkaraštis (${ctx.hourInt}:00)` };
    }
    case "daylight": {
      const wantDark = p.mode === "dark";
      return { ok: wantDark ? !ctx.isDay : ctx.isDay, label: wantDark ? "Sutemus" : "Šviesu" };
    }
    case "precip": {
      const c = p.condition || "no_rain";
      let ok = true;
      if (c === "no_rain") ok = ctx.rainMm <= 0.05;
      else if (c === "rain") ok = ctx.rainMm > 0.05;
      else if (c === "snow") ok = ctx.snowCm > 0.05;
      else if (c === "no_snow") ok = ctx.snowCm <= 0.05;
      return { ok, label: `Krituliai (${c})` };
    }
    case "temp": {
      const lim = Number(p.valueC ?? 0);
      return { ok: p.op === "gt" ? ctx.airTemp > lim : ctx.airTemp < lim, label: `Temp. ${ctx.airTemp}°C` };
    }
    case "humidity": {
      const lim = Number(p.valuePct ?? 70);
      return { ok: p.op === "gt" ? ctx.rh > lim : ctx.rh < lim, label: `Drėgmė ${ctx.rh}%` };
    }
    default:
      return { ok: false, label: rule.type };
  }
}

function evaluatePriorityRulesList(rulesList, ctx) {
  if (!Array.isArray(rulesList) || rulesList.length === 0) {
    return { shouldBeOn: false, reason: "Nėra pridėtų taisyklių" };
  }

  for (let i = 0; i < rulesList.length; i++) {
    const rule = rulesList[i];
    if (rule.type === "auto_off" || rule.type === "power_guard" || rule.type === "geofence") continue;

    const res = checkSingleRuleCondition(rule, ctx);
    const prio = `#${i + 1}`;

    if (rule.role === "must_pass") {
      if (!res.ok) return { shouldBeOn: false, reason: `🔒 ${prio} blokavo: ${res.label} netenkina` };
    } else if (rule.role === "turn_off") {
      if (res.ok) return { shouldBeOn: false, reason: `🔴 ${prio} išjungė: ${res.label}` };
    } else if (rule.role === "turn_on") {
      if (res.ok) return { shouldBeOn: true, reason: `🟢 ${prio} įjungė: ${res.label}` };
    }
  }

  return { shouldBeOn: false, reason: "⚪ Nė viena įjungimo taisyklė nesuveikė" };
}

async function executeSmartRelaysAutopilot(db, admin) {
  const snap = await db.collection("user_smart_devices").where("type", "==", "smart_relay").get();
  if (snap.empty) return;

  const elecDoc = await db.collection("electricity_prices").doc("market_data").get();
  const allHours = elecDoc.exists ? elecDoc.data().hours || [] : [];

  const now = new Date();
  const todayStr = now.toLocaleDateString("lt-LT", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit", day: "2-digit" });
  const hourInt = parseInt(now.toLocaleTimeString("en-GB", { timeZone: "Europe/Vilnius", hour: "2-digit", hour12: false }), 10);
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
      const rulesList = Array.isArray(cfg.rulesList) ? cfg.rulesList : [];

      let tel = dev.telemetry || {};
      try {
        tel = await syncUserShellyTelemetry(db, admin, userId, dev.id);
      } catch (e) {
        return;
      }

      const powerW = Number(tel.powerW || 0);
      const isCurrentlyOn = tel.fanOnOff === "on";

      // ⏱️ 0. PATIKRINAME AUTO-OFF LAIKMATĮ (veikia visada, net be autopiloto!)
      if (isCurrentlyOn && dev.autoOffAtTimestamp && Date.now() >= Number(dev.autoOffAtTimestamp)) {
        await sendShellyRelayCommand(db, admin, userId, { deviceDocId: dev.id, turn: "off" });
        await doc.ref.update({
          autoOffAtTimestamp: null,
          "telemetry.lastRuleDecision": "⏱️ Auto-OFF laikmatis suveikė -> IŠJUNGTA",
        });
        return;
      }

      const pgRule = rulesList.find((r) => r.type === "power_guard");
      if (pgRule) {
        const pg = pgRule.params || {};
        if (pg.overloadEnabled !== false && isCurrentlyOn && powerW > Number(pg.overloadW || 2500)) {
          await sendShellyRelayCommand(db, admin, userId, { deviceDocId: dev.id, turn: "off" });
          await sendRelayPushAlert(db, admin, userId, `🚨 PERKROVA: ${dev.name}`, `Relė išjungta! Galia ${powerW} W > ${pg.overloadW} W.`);
          await doc.ref.update({ "telemetry.lastRuleDecision": `🚨 Perkrova ${powerW} W -> IŠJUNGTA` });
          return;
        }

        if (pg.idleEnabled && isCurrentlyOn) {
          const idleW = Number(pg.idleW || 15);
          const idleMin = Number(pg.idleMin || 10);
          if (powerW < idleW) {
            const lowSince = dev.lowPowerSinceTs || Date.now();
            if (!dev.lowPowerSinceTs) {
              await doc.ref.update({ lowPowerSinceTs: lowSince });
            } else if (Date.now() - lowSince >= idleMin * 60 * 1000) {
              await sendShellyRelayCommand(db, admin, userId, { deviceDocId: dev.id, turn: "off" });
              await doc.ref.update({ lowPowerSinceTs: null, "telemetry.lastRuleDecision": `✅ Darbas baigtas (< ${idleW} W) -> IŠJUNGTA` });
              await sendRelayPushAlert(db, admin, userId, `✅ Darbas baigtas: ${dev.name}`, `Galia < ${idleW} W ilgiau nei ${idleMin} min. Išjungta.`);
              return;
            }
          } else if (dev.lowPowerSinceTs) {
            await doc.ref.update({ lowPowerSinceTs: null });
          }
        }
      }

      if (!cfg.autopilotEnabled) return;

      const lat = Number(cfg.lat || 55.2885);
      const lng = Number(cfg.lng || 23.9745);
      let airTemp = 10, rh = 70, rainMm = 0, snowCm = 0, isDay = hourInt >= 7 && hourInt <= 20;

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
      } catch (e) {}

      const decision = evaluatePriorityRulesList(rulesList, { weekday1to7, hourInt, isDay, airTemp, rh, rainMm, snowCm, priceCt, todayHours });
      const targetTurn = decision.shouldBeOn ? "on" : "off";

      if (tel.fanOnOff !== targetTurn) {
        const autoOffRule = rulesList.find((r) => r.type === "auto_off");
        const timerSec = targetTurn === "on" && autoOffRule ? Number(autoOffRule.params?.minutes || 30) * 60 : 0;
        await sendShellyRelayCommand(db, admin, userId, { deviceDocId: dev.id, turn: targetTurn, timerSec });
      }

      await doc.ref.update({ "telemetry.lastRuleDecision": decision.reason });
    })
  );
}

module.exports = {
  sendShellyRelayCommand,
  executeSmartRelaysAutopilot,
};