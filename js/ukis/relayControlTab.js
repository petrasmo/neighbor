// js/ukis/relayControlTab.js
import { showBottomToast, showDialog } from '../core/ui.js';

let relayMiniMap = null;
let autoOffCountdownInterval = null;
let geoWatchId = null;
let geoZoneState = {}; // Saugiklis: fiksuoja 'inside' arba 'outside', kad suveiktų tik kertant ribą
let relayMarker = null;
let relayCircle = null;
let isRelayMapFullscreen = false;
let showRadiusCircle = true;

const RULE_CATALOG = {
    geofence_enter: {
        title: "📱 GPS Priartėjus prie relės (Atvykus į zoną ≤ X m)",
        defaultRole: "turn_on",
        defaultParams: { radiusM: 25, action: "on" }
    },
    geofence_leave: {
        title: "🚗 GPS Nutolus nuo relės (Išvykus už zonos > X m)",
        defaultRole: "turn_off",
        defaultParams: { radiusM: 30, action: "off" }
    },
    price_limit: { title: "⚡ Nord Pool Kainos Riba", defaultRole: "turn_on", defaultParams: { op: "lt", maxCt: 10.0 } },
    cheapest_hours: { title: "🏆 Nord Pool N Pigiausių Valandų per Parą", defaultRole: "turn_on", defaultParams: { count: 4 } },
    schedule: {
        title: "🗓️ Savaitinis Tvarkaraštis (Pr–Sk valandos)",
        defaultRole: "turn_on",
        defaultParams: { days: { "1": [6,7,8,18,19,20], "2": [6,7,8,18,19,20], "3": [6,7,8,18,19,20], "4": [6,7,8,18,19,20], "5": [6,7,8,18,19,20], "6": [8,9,10,18,19,20], "7": [8,9,10,18,19,20] } }
    },
    daylight: { title: "🌗 Šviesu / Sutemus (Saulėtekis / Saulėlydis)", defaultRole: "turn_on", defaultParams: { mode: "dark" } },
    precip: { title: "🌧️ Krituliai (Lietus / Sniegas)", defaultRole: "must_pass", defaultParams: { condition: "no_rain" } },
    temp: { title: "🌡️ Lauko Oro Temperatūra (°C)", defaultRole: "turn_on", defaultParams: { op: "lt", valueC: 0 } },
    humidity: { title: "💧 Lauko Oro Drėgmė (RH % – Ventiliacijai)", defaultRole: "must_pass", defaultParams: { op: "lt", valuePct: 70 } },
    auto_off: { title: "⏱️ Apsauginis Laikmatis (Auto-OFF po X min.)", defaultRole: "safety", defaultParams: { minutes: 30 } },
    power_guard: { title: "🛡️ Galios (W) Apsauga (Perkrova ir Baigtas darbas)", defaultRole: "safety", defaultParams: { overloadEnabled: true, overloadW: 2500, idleEnabled: true, idleW: 15, idleMin: 10 } }
};

function normalizeRelayConfig(rawCfg = {}) {
    const list = Array.isArray(rawCfg.rulesList) ? JSON.parse(JSON.stringify(rawCfg.rulesList)) : [];
    // Suderinamumas su senesniu 'geofence' pavadinimu
    list.forEach(r => { if (r.type === 'geofence') r.type = 'geofence_enter'; });
    return {
        autopilotEnabled: rawCfg.autopilotEnabled ?? false,
        lat: Number(rawCfg.lat ?? 55.2885),
        lng: Number(rawCfg.lng ?? 23.9745),
        pulseSeconds: Number(rawCfg.pulseSeconds ?? rawCfg.pulse?.seconds ?? 2),
        rulesList: list
    };
}

export function renderRelayControlTabHtml(dev, tel) {
    const cfg = normalizeRelayConfig(dev.config || {});
    const isOn = tel.fanOnOff === 'on';
    const powerW = Number(tel.powerW ?? 0);
    const voltageV = Number(tel.voltageV ?? 230);
    const totalKwh = Number(tel.totalKwh ?? 0);

    const catalogOptions = Object.entries(RULE_CATALOG).map(([key, meta]) =>
        `<option value="${key}">${meta.title}</option>`
    ).join('');

    return `
        <div class="space-y-4 text-xs max-w-5xl mx-auto">
            <!-- 1. BŪSENOS, VALDYMO IR AUTOPILOTO JUOSTA -->
            <div class="bg-tractorBg border-2 ${isOn ? 'border-green-500' : 'border-tractorBorder'} rounded-2xl p-4 shadow-md space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl ${isOn ? 'bg-green-500/20 border-2 border-green-500' : 'bg-tractorSurface border border-tractorBorder'} flex items-center justify-center text-2xl">⚡</div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <strong class="font-oswald text-xl sm:text-2xl font-black uppercase ${isOn ? 'text-green-500' : 'text-slate-400'}">
                                    ${isOn ? '🟢 ĮJUNGTA (ON)' : '⚪ IŠJUNGTA (OFF)'}
                                </strong>
                                <span id="relay-live-countdown-badge" class="hidden px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono font-extrabold text-xs animate-pulse"></span>
                                <span class="px-2.5 py-0.5 rounded-lg bg-tractorSurface border border-tractorBorder font-mono font-bold text-amber-500">
                                    ${powerW} W • ${voltageV} V • ${totalKwh.toFixed(2)} kWh
                                </span>
                            </div>
                            <span class="block text-[11px] text-slate-400 mt-0.5">
                                ${tel.lastRuleDecision ? `🤖 Autopilotas: <strong class="text-amber-400">${tel.lastRuleDecision}</strong>` : 'Valdykite rankiniu būdu arba sudėkite taisykles pagal prioritetą žemiau'}
                            </span>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" id="btn-relay-turn-on" style="background-color: #2E7D32; color: #FFFFFF;" class="h-10 px-4 hover:opacity-90 font-extrabold rounded-xl text-xs uppercase shadow cursor-pointer transition">⚡ Įjungti</button>
                        <button type="button" id="btn-relay-turn-off" class="h-10 px-4 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs uppercase shadow cursor-pointer transition">⏻ Išjungti</button>
                        <div class="flex items-center bg-tractorSurface border border-tractorBorder rounded-xl p-1 gap-1">
                            <button type="button" id="btn-relay-pulse-now" class="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase cursor-pointer transition">🚪 Impulsas</button>
                            <input id="inp-pulse-sec" type="number" min="1" max="60" value="${cfg.pulseSeconds}" class="w-11 h-8 bg-tractorBg border border-tractorBorder rounded-lg text-center font-mono font-bold outline-none" style="color: var(--text-main);">
                            <span class="text-[10px] text-slate-400 pr-1">s</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-tractorBorder/60">
                    <label class="flex items-center gap-2.5 cursor-pointer select-none">
                        <input type="checkbox" id="chk-relay-autopilot" class="w-5 h-5 accent-tractorPrimary cursor-pointer" ${cfg.autopilotEnabled ? 'checked' : ''}>
                        <div>
                            <strong class="text-xs sm:text-sm font-bold block" style="color: var(--text-main);">🤖 Įjungti Taisyklių ir GPS Autopilotą (Pagal Prioritetą #1 ➔ #N)</strong>
                            <span class="text-[11px] text-slate-400">Kai įjungta – GPS radaras gyvai seka atstumą: priartėjus įjungia/atidaro, nutolus išjungia/uždaro!</span>
                        </div>
                    </label>

                    <button type="button" id="btn-save-relay-rules" style="background-color: #2E7D32; color: #FFFFFF;" class="h-10 px-5 hover:opacity-90 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg cursor-pointer transition flex items-center gap-1.5">
                        <span>💾</span> <span>Išsaugoti Nustatymus</span>
                    </button>
                </div>
            </div>

            <!-- 2. TAISYKLIŲ KONSTRUKTORIUS (PO VIENĄ PAGAL PRIORITETĄ) -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 shadow-md space-y-3.5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-tractorBorder/60 pb-3">
                    <div>
                        <h4 class="font-oswald text-base sm:text-lg font-bold uppercase flex items-center gap-2" style="color: var(--text-main);">
                            <span>📋</span> Valdymo Taisyklės ir Prioritetų Eilė
                        </h4>
                        <p class="text-[11px] text-slate-400">Pridėkite po vieną taisyklę iš sąrašo (pvz., <strong>GPS Priartėjus</strong> ir <strong>GPS Nutolus</strong>) ir kilnokite su <strong>⬆️ / ⬇️</strong>.</p>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                        <select id="sel-add-relay-rule-type" class="h-10 bg-tractorSurface border border-tractorBorder rounded-xl px-3 font-bold text-xs outline-none cursor-pointer" style="color: var(--text-main);">
                            ${catalogOptions}
                        </select>
                        <button type="button" id="btn-add-relay-rule" style="background-color: #2E7D32; color: #FFFFFF;" class="h-10 px-4 hover:opacity-90 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer transition whitespace-nowrap flex items-center gap-1">
                            <span>➕</span> <span>Pridėti taisyklę</span>
                        </button>
                    </div>
                </div>

                <div id="relay-rules-priority-list" class="space-y-2.5"></div>
            </div>

            <!-- 3. TIKSLUS RELĖS VIETOS ŽEMĖLAPIS (MAX-ZOOM 22 + PILNAS EKRANAS) -->
            <div id="relay-map-card-wrap" class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 shadow-md space-y-3 flex flex-col">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2.5 shrink-0">
                    <div>
                        <h4 class="font-oswald text-base font-bold uppercase flex items-center gap-1.5" style="color: var(--text-main);">
                            <span>📍</span> Tiksli Relės GPS Vieta (Vartams, Orams ir Saulėtekiui)
                        </h4>
                        <span class="text-[11px] text-slate-400">Priartinkite (arba išdidinkite į <strong>⛶ Pilną ekraną</strong>) ir spustelėkite arba nutempkite žymeklį tiksliai ant vartų!</span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <label class="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer bg-tractorSurface px-2.5 py-1.5 rounded-lg border border-tractorBorder select-none" style="color: var(--text-main);">
                            <input type="checkbox" id="chk-show-map-circle" checked class="accent-tractorPrimary">
                            <span>Rodyti spindulio ratą</span>
                        </label>
                        <span id="lbl-relay-coords" class="font-mono text-[11px] text-green-500 font-bold bg-tractorSurface px-2.5 py-1.5 rounded-lg border border-tractorBorder">
                            ${cfg.lat.toFixed(6)}, ${cfg.lng.toFixed(6)}
                        </span>
                        <button type="button" id="btn-relay-set-my-gps" class="h-8 px-3 bg-tractorSurface hover:bg-tractorPrimary hover:text-white border border-tractorBorder rounded-lg font-bold text-[11px] cursor-pointer transition" style="color: var(--text-main);">📡 Mano GPS</button>
                        <button type="button" id="btn-relay-map-fullscreen" style="background-color: #2E7D32; color: #FFFFFF;" class="h-8 px-3 hover:opacity-90 rounded-lg font-extrabold text-[11px] cursor-pointer transition flex items-center gap-1">
                            <span id="relay-fs-icon">⛶</span> <span id="relay-fs-text">Pilnas ekranas</span>
                        </button>
                    </div>
                </div>

                <div id="relay-location-mini-map" style="width: 100%; height: 300px; min-height: 300px; border-radius: 14px; border: 1.5px solid var(--border-color); z-index: 10; background: #0f1712; cursor: crosshair;"></div>
            </div>
        </div>
    `;
}

export function bindRelayControlEvents(currentUser, dev, executeCommand, onConfigSaved) {
    const cfg = normalizeRelayConfig(dev.config || {});

    const startLiveAutoOffWatcher = (targetTs) => {
        if (autoOffCountdownInterval) clearInterval(autoOffCountdownInterval);
        const badge = document.getElementById('relay-live-countdown-badge');
        if (!targetTs) {
            badge?.classList.add('hidden');
            return;
        }

        autoOffCountdownInterval = setInterval(() => {
            const bEl = document.getElementById('relay-live-countdown-badge');
            if (!bEl) {
                clearInterval(autoOffCountdownInterval);
                return;
            }
            const diffSec = Math.round((targetTs - Date.now()) / 1000);
            if (diffSec <= 0) {
                clearInterval(autoOffCountdownInterval);
                bEl.textContent = "⏳ Išjungiama dabar...";
                executeCommand({ deviceDocId: dev.id, fanOnOff: 'off' }, "⏱️ Auto-OFF laikmatis baigėsi – relė išjungta!");
                return;
            }
            const m = String(Math.floor(diffSec / 60)).padStart(2, '0');
            const s = String(diffSec % 60).padStart(2, '0');
            bEl.classList.remove('hidden');
            bEl.textContent = `⏳ Auto-OFF po ${m}:${s}`;
        }, 1000);
    };

    const startContinuousGeofenceWatcher = () => {
        if (geoWatchId !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(geoWatchId);
            geoWatchId = null;
        }

        const hasGeoRules = cfg.rulesList.some(r => r.type === 'geofence_enter' || r.type === 'geofence_leave');
        if (!hasGeoRules || !navigator.geolocation) return;

        geoWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                const distM = Math.round(calcDistanceMeters(pos.coords.latitude, pos.coords.longitude, cfg.lat, cfg.lng));
                const accM = Math.round(pos.coords.accuracy || 0);
                const autoChecked = !!document.getElementById('chk-relay-autopilot')?.checked;

                cfg.rulesList.forEach((rule, idx) => {
                    if (rule.type !== 'geofence_enter' && rule.type !== 'geofence_leave') return;

                    const radM = Number(rule.params?.radiusM || 25);
                    const isEnterRule = rule.type === 'geofence_enter';
                    const isInside = distM <= radM;
                    const stEl = document.getElementById(`geo-dist-status-${idx}`);

                    if (stEl) {
                        stEl.innerHTML = isInside
                            ? `<strong class="text-green-500">🟢 Gyvas GPS: ${distM} m (±${accM}m • Zonoje ≤ ${radM} m)</strong>`
                            : `<strong class="text-amber-500">🟠 Gyvas GPS: ${distM} m (±${accM}m • Už ${radM} m ribos)</strong>`;
                    }

                    if (!autoChecked) return;

                    const stateKey = `${dev.id}_${rule.type}`;
                    const prevState = geoZoneState[stateKey]; // 'inside' | 'outside'

                    if (isEnterRule) {
                        // Priartėjimo taisyklė: suveikia kai esi zonoje (≤ radM), o prieš tai nebuvai 'inside'
                        if (isInside && prevState !== 'inside') {
                            geoZoneState[stateKey] = 'inside';
                            triggerGeoAction(rule, cfg, dev, executeCommand, `📍 Priartėjote (${distM} m ≤ ${radM} m)`);
                        } else if (distM > radM + 4) {
                            geoZoneState[stateKey] = 'outside';
                        }
                    } else {
                        // Nutolimo taisyklė: suveikia kai nutolsti (> radM), o prieš tai nebuvai 'outside'
                        if (!isInside && prevState !== 'outside') {
                            geoZoneState[stateKey] = 'outside';
                            triggerGeoAction(rule, cfg, dev, executeCommand, `🚗 Nutolote (${distM} m > ${radM} m)`);
                        } else if (distM <= Math.max(2, radM - 3)) {
                            geoZoneState[stateKey] = 'inside';
                        }
                    }
                });
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
    };

    const renderRulesListUi = () => {
        const listEl = document.getElementById('relay-rules-priority-list');
        if (!listEl) return;

        if (cfg.rulesList.length === 0) {
            listEl.innerHTML = `
                <div class="py-8 text-center bg-tractorSurface/60 border border-dashed border-tractorBorder rounded-2xl space-y-1.5">
                    <span class="text-2xl block">⚡</span>
                    <strong class="text-xs block" style="color: var(--text-main);">Dar nepridėta nė viena automatinė taisyklė</strong>
                    <p class="text-[11px] text-slate-400">Pasirinkite taisyklę sąraše viršuje ir paspauskite <strong>„➕ Pridėti taisyklę“</strong>.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = cfg.rulesList.map((rule, idx) => renderSingleRuleCardHtml(rule, idx, cfg.rulesList.length)).join('');
        bindSingleRuleCardEvents(cfg, renderRulesListUi, dev, executeCommand, startContinuousGeofenceWatcher);
        updateMapRadiusFromGeofenceRule(cfg);
        startContinuousGeofenceWatcher();
    };

    renderRulesListUi();
    setTimeout(() => initRelayMiniMap(cfg), 120);

    const existingAutoOffRule = cfg.rulesList.find(r => r.type === 'auto_off');
    if (dev.telemetry?.fanOnOff === 'on') {
        const ts = dev.autoOffAtTimestamp && dev.autoOffAtTimestamp > Date.now()
            ? dev.autoOffAtTimestamp
            : (existingAutoOffRule ? Date.now() + Number(existingAutoOffRule.params?.minutes || 3) * 60 * 1000 : null);
        if (ts) startLiveAutoOffWatcher(ts);
    } else {
        startLiveAutoOffWatcher(null);
    }

    document.getElementById('btn-add-relay-rule')?.addEventListener('click', () => {
        const type = document.getElementById('sel-add-relay-rule-type')?.value;
        if (!type || !RULE_CATALOG[type]) return;

        if (cfg.rulesList.some(r => r.type === type)) {
            showBottomToast("Ši taisyklė jau yra sąraše – galite ją redaguoti arba pakelti prioritetu!", "warning");
            return;
        }

        const meta = RULE_CATALOG[type];
        cfg.rulesList.push({
            id: 'rule_' + Date.now(),
            type: type,
            role: meta.defaultRole,
            params: JSON.parse(JSON.stringify(meta.defaultParams))
        });

        renderRulesListUi();
        showBottomToast(`➕ Pridėta: ${meta.title} (Prioritetas #${cfg.rulesList.length})`);
    });

    document.getElementById('btn-relay-turn-on')?.addEventListener('click', () => {
        const autoOffRule = cfg.rulesList.find(r => r.type === 'auto_off');
        const timerSec = autoOffRule ? Number(autoOffRule.params?.minutes || 30) * 60 : 0;
        if (timerSec > 0) startLiveAutoOffWatcher(Date.now() + timerSec * 1000);
        executeCommand({ deviceDocId: dev.id, fanOnOff: 'on', timerSec }, timerSec > 0 ? `⚡ Relė įjungta (Auto-OFF po ${timerSec / 60} min.)!` : '⚡ Relė įjungta (ON)!');
    });

    document.getElementById('btn-relay-turn-off')?.addEventListener('click', () => {
        startLiveAutoOffWatcher(null);
        executeCommand({ deviceDocId: dev.id, fanOnOff: 'off' }, '⏻ Relė išjungta (OFF)!');
    });

    document.getElementById('btn-relay-pulse-now')?.addEventListener('click', () => {
        const sec = Math.max(1, parseInt(document.getElementById('inp-pulse-sec')?.value || '2', 10));
        cfg.pulseSeconds = sec;
        executeCommand({ deviceDocId: dev.id, fanOnOff: 'on', timerSec: sec }, `🚪 Išsiųstas ${sec} sek. impulsas!`);
    });

    document.getElementById('chk-show-map-circle')?.addEventListener('change', (e) => {
        showRadiusCircle = e.target.checked;
        updateMapRadiusFromGeofenceRule(cfg);
    });

    document.getElementById('btn-relay-set-my-gps')?.addEventListener('click', () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            cfg.lat = pos.coords.latitude;
            cfg.lng = pos.coords.longitude;
            updateRelayMapMarker(cfg.lat, cfg.lng, true);
            showBottomToast("📍 Taškas padėtas jūsų dabartinėje GPS vietoje!");
        }, () => showBottomToast("Nepavyko gauti telefono GPS.", "error"));
    });

    document.getElementById('btn-relay-map-fullscreen')?.addEventListener('click', () => toggleRelayMapFullscreen());

    document.getElementById('chk-relay-autopilot')?.addEventListener('change', (e) => {
        cfg.autopilotEnabled = e.target.checked;
        if (e.target.checked) {
            geoZoneState = {};
            startContinuousGeofenceWatcher();
        }
    });

    document.getElementById('btn-save-relay-rules')?.addEventListener('click', async () => {
        cfg.autopilotEnabled = !!document.getElementById('chk-relay-autopilot')?.checked;
        cfg.pulseSeconds = Math.max(1, parseInt(document.getElementById('inp-pulse-sec')?.value || '2', 10));
        await onConfigSaved(true, cfg);

        const autoRule = cfg.rulesList.find(r => r.type === 'auto_off');
        if (dev.telemetry?.fanOnOff === 'on' && autoRule) {
            const sec = Math.max(1, Number(autoRule.params?.minutes || 3)) * 60;
            startLiveAutoOffWatcher(Date.now() + sec * 1000);
        } else if (!autoRule) {
            startLiveAutoOffWatcher(null);
        }

        geoZoneState = {};
        startContinuousGeofenceWatcher();
        showBottomToast("💾 Taisyklių prioritetų eilė ir tiksli relės GPS vieta išsaugota!");
    });
}

function triggerGeoAction(rule, cfg, dev, executeCommand, prefixMsg) {
    const act = rule.params?.action || (rule.type === 'geofence_leave' ? 'off' : 'on');
    if (act === 'off' || rule.role === 'turn_off') {
        executeCommand({ deviceDocId: dev.id, fanOnOff: 'off' }, `${prefixMsg} ➔ Relė IŠJUNGTA (OFF)!`);
    } else if (act === 'pulse') {
        executeCommand({ deviceDocId: dev.id, fanOnOff: 'on', timerSec: cfg.pulseSeconds }, `${prefixMsg} ➔ Išsiųstas ${cfg.pulseSeconds} s impulsas vartams!`);
    } else {
        executeCommand({ deviceDocId: dev.id, fanOnOff: 'on' }, `${prefixMsg} ➔ Relė ĮJUNGTA (ON)!`);
    }
}

function renderSingleRuleCardHtml(rule, idx, totalCount) {
    const meta = RULE_CATALOG[rule.type] || { title: rule.type };
    const p = rule.params || {};
    const isSafety = rule.type === 'auto_off' || rule.type === 'power_guard';
    const isGeo = rule.type === 'geofence_enter' || rule.type === 'geofence_leave';

    const roleSelectHtml = isSafety
        ? `<span class="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 font-extrabold text-[10px] uppercase">🛡️ Saugiklis</span>`
        : (isGeo
            ? `<span class="px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 font-extrabold text-[10px] uppercase">📡 Gyvas GPS Radaras</span>`
            : `
            <select data-rule-role="${idx}" class="rule-role-select h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-extrabold text-[11px] outline-none cursor-pointer" style="color: var(--text-main);">
                <option value="turn_on" ${rule.role === 'turn_on' ? 'selected' : ''}>🟢 ĮJUNGTI relę, kai sąlyga tinka</option>
                <option value="must_pass" ${rule.role === 'must_pass' ? 'selected' : ''}>🔒 GRIEŽTAS FILTRAS (Jei netinka ➔ Išjungti ir blokuoti žemesnes)</option>
                <option value="turn_off" ${rule.role === 'turn_off' ? 'selected' : ''}>🔴 IŠJUNGTI relę, kai sąlyga tinka</option>
            </select>
        `);

    let bodyHtml = '';
    if (rule.type === 'geofence_enter' || rule.type === 'geofence_leave') {
        const isEnter = rule.type === 'geofence_enter';
        const curAct = p.action || (isEnter ? 'on' : 'off');
        bodyHtml = `
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-slate-400">${isEnter ? 'Kai priartėju arčiau nei (≤):' : 'Kai nutolstu toliau nei (>):'}</span>
                    <input data-param="radiusM" data-idx="${idx}" type="number" step="5" min="5" max="2000" value="${p.radiusM ?? 25}" class="rule-param-input w-20 h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-center" style="color: var(--text-main);">
                    <span class="font-bold text-green-500">m</span>
                    <select data-param="action" data-idx="${idx}" class="rule-param-input h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2.5 font-bold" style="color: var(--text-main);">
                        <option value="on" ${curAct === 'on' ? 'selected' : ''}>⚡ Įjungti relę (ON)</option>
                        <option value="off" ${curAct === 'off' ? 'selected' : ''}>⏻ Išjungti relę (OFF)</option>
                        <option value="pulse" ${curAct === 'pulse' ? 'selected' : ''}>🚪 Siųsti Impulsą (Vartams)</option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <span id="geo-dist-status-${idx}" class="font-mono text-[11px] text-slate-400">📡 Laukiama GPS...</span>
                    <button type="button" data-test-geo="${idx}" class="btn-test-rule-geo h-8 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] cursor-pointer transition">📡 Tikrinti dabar</button>
                </div>
            </div>`;
    } else if (rule.type === 'price_limit') {
        bodyHtml = `
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-slate-400">Nord Pool kaina yra:</span>
                <select data-param="op" data-idx="${idx}" class="rule-param-input h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2.5 font-bold" style="color: var(--text-main);">
                    <option value="lt" ${p.op === 'lt' ? 'selected' : ''}>Žemiau arba lygi (≤)</option>
                    <option value="gt" ${p.op === 'gt' ? 'selected' : ''}>Aukščiau (&gt;)</option>
                </select>
                <input data-param="maxCt" data-idx="${idx}" type="number" step="0.5" value="${p.maxCt ?? 10}" class="rule-param-input w-20 h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-center" style="color: var(--text-main);">
                <span class="font-bold text-amber-500">ct / kWh (be PVM)</span>
            </div>`;
    } else if (rule.type === 'cheapest_hours') {
        bodyHtml = `
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-slate-400">Atrinkti ir įjungti:</span>
                <input data-param="count" data-idx="${idx}" type="number" min="1" max="24" value="${p.count ?? 4}" class="rule-param-input w-16 h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-center" style="color: var(--text-main);">
                <span class="font-bold text-green-500">pigiausias valandas per parą (00:00–23:59)</span>
            </div>`;
    } else if (rule.type === 'daylight') {
        bodyHtml = `
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-slate-400">Paros metas pagal saulėtekį/saulėlydį:</span>
                <select data-param="mode" data-idx="${idx}" class="rule-param-input h-8 bg-tractorBg border border-tractorBorder rounded-lg px-3 font-bold" style="color: var(--text-main);">
                    <option value="dark" ${p.mode === 'dark' ? 'selected' : ''}>🌙 Kai SUTEMUS (Naktis)</option>
                    <option value="light" ${p.mode === 'light' ? 'selected' : ''}>☀️ Kai ŠVIESU (Diena)</option>
                </select>
            </div>`;
    } else if (rule.type === 'precip') {
        bodyHtml = `
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-slate-400">Krituliai virš relės GPS vietos:</span>
                <select data-param="condition" data-idx="${idx}" class="rule-param-input h-8 bg-tractorBg border border-tractorBorder rounded-lg px-3 font-bold" style="color: var(--text-main);">
                    <option value="no_rain" ${p.condition === 'no_rain' ? 'selected' : ''}>☀️ Tik kai NELYJA (0 mm)</option>
                    <option value="rain" ${p.condition === 'rain' ? 'selected' : ''}>🌧️ Kai LYJA (&gt; 0.1 mm)</option>
                    <option value="snow" ${p.condition === 'snow' ? 'selected' : ''}>❄️ Kai SNINGA</option>
                    <option value="no_snow" ${p.condition === 'no_snow' ? 'selected' : ''}>🌤️ Tik kai NESNINGA</option>
                </select>
            </div>`;
    } else if (rule.type === 'temp') {
        bodyHtml = `
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-slate-400">Lauko oro temperatūra:</span>
                <select data-param="op" data-idx="${idx}" class="rule-param-input h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2.5 font-bold" style="color: var(--text-main);">
                    <option value="lt" ${p.op === 'lt' ? 'selected' : ''}>Žemesnė nei (&lt;)</option>
                    <option value="gt" ${p.op === 'gt' ? 'selected' : ''}>Aukštesnė nei (&gt;)</option>
                </select>
                <input data-param="valueC" data-idx="${idx}" type="number" step="0.5" value="${p.valueC ?? 0}" class="rule-param-input w-20 h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-center" style="color: var(--text-main);">
                <span class="font-bold text-sky-400">°C</span>
            </div>`;
    } else if (rule.type === 'humidity') {
        bodyHtml = `
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-slate-400">Lauko santykinė drėgmė:</span>
                <select data-param="op" data-idx="${idx}" class="rule-param-input h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2.5 font-bold" style="color: var(--text-main);">
                    <option value="lt" ${p.op === 'lt' ? 'selected' : ''}>Mažesnė nei (&lt;)</option>
                    <option value="gt" ${p.op === 'gt' ? 'selected' : ''}>Didesnė nei (&gt;)</option>
                </select>
                <input data-param="valuePct" data-idx="${idx}" type="number" min="10" max="100" value="${p.valuePct ?? 70}" class="rule-param-input w-20 h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-center" style="color: var(--text-main);">
                <span class="font-bold text-sky-400">% (pvz. &lt; 70% sandėlio ventiliacijai)</span>
            </div>`;
    } else if (rule.type === 'auto_off') {
        bodyHtml = `
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-slate-400">Įjungus relę, automatiškai išjungti po:</span>
                <input data-param="minutes" data-idx="${idx}" type="number" min="1" max="720" value="${p.minutes ?? 30}" class="rule-param-input w-20 h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold text-center" style="color: var(--text-main);">
                <span class="font-bold text-amber-500">minučių</span>
            </div>`;
    } else if (rule.type === 'power_guard') {
        bodyHtml = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div class="flex items-center gap-2 bg-tractorBg p-2 rounded-xl border border-tractorBorder">
                    <input data-param-chk="overloadEnabled" data-idx="${idx}" type="checkbox" class="rule-param-chk accent-red-500" ${p.overloadEnabled !== false ? 'checked' : ''}>
                    <span class="text-red-400 font-bold">Perkrova &gt;</span>
                    <input data-param="overloadW" data-idx="${idx}" type="number" step="50" value="${p.overloadW ?? 2500}" class="rule-param-input w-20 h-7 bg-tractorSurface border border-tractorBorder rounded px-2 font-mono font-bold text-center" style="color: var(--text-main);">
                    <span>W ➔ Išjungti + SOS</span>
                </div>
                <div class="flex items-center gap-2 bg-tractorBg p-2 rounded-xl border border-tractorBorder">
                    <input data-param-chk="idleEnabled" data-idx="${idx}" type="checkbox" class="rule-param-chk accent-tractorPrimary" ${p.idleEnabled ? 'checked' : ''}>
                    <span class="text-green-500 font-bold">Baigė darbą &lt;</span>
                    <input data-param="idleW" data-idx="${idx}" type="number" value="${p.idleW ?? 15}" class="rule-param-input w-14 h-7 bg-tractorSurface border border-tractorBorder rounded px-1.5 font-mono font-bold text-center" style="color: var(--text-main);">
                    <span>W per</span>
                    <input data-param="idleMin" data-idx="${idx}" type="number" value="${p.idleMin ?? 10}" class="rule-param-input w-12 h-7 bg-tractorSurface border border-tractorBorder rounded px-1.5 font-mono font-bold text-center" style="color: var(--text-main);">
                    <span>min.</span>
                </div>
            </div>`;
    } else if (rule.type === 'schedule') {
        const dayNames = [{ key: '1', label: 'Pr' }, { key: '2', label: 'An' }, { key: '3', label: 'Tr' }, { key: '4', label: 'Kt' }, { key: '5', label: 'Pn' }, { key: '6', label: 'Št' }, { key: '7', label: 'Sk' }];
        const daysObj = p.days || {};
        const rows = dayNames.map(d => {
            const activeHours = daysObj[d.key] || [];
            const cells = Array.from({ length: 24 }, (_, h) => {
                const active = activeHours.includes(h);
                return `<button type="button" data-rule-idx="${idx}" data-sched-day="${d.key}" data-sched-hour="${h}" class="relay-sched-cell h-6 rounded text-[9px] font-mono font-bold transition cursor-pointer border" style="background:${active ? '#2E7D32' : 'var(--bg-bg)'};color:${active ? '#FFFFFF' : 'var(--text-muted)'};border-color:${active ? '#1B5E20' : 'var(--border-color)'};">${String(h).padStart(2, '0')}</button>`;
            }).join('');
            return `<div class="flex items-center gap-1.5"><button type="button" data-rule-idx="${idx}" data-toggle-whole-day="${d.key}" class="relay-day-toggle w-8 h-6 rounded bg-tractorBg border border-tractorBorder text-[10px] font-extrabold cursor-pointer shrink-0" style="color:var(--text-main);">${d.label}</button><div class="flex-1" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:2px;">${cells}</div></div>`;
        }).join('');
        bodyHtml = `<div class="space-y-1.5 pt-1">${rows}</div>`;
    }

    return `
        <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-3.5 space-y-2.5 shadow-sm transition">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <span style="background-color: #2E7D32; color: #FFFFFF;" class="px-2.5 py-0.5 rounded-lg font-mono font-black text-[11px]">#${idx + 1} Prioritetas</span>
                    <strong class="font-bold text-xs sm:text-sm" style="color: var(--text-main);">${meta.title}</strong>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${roleSelectHtml}
                    <button type="button" data-move-up="${idx}" class="btn-rule-up w-8 h-8 rounded-lg bg-tractorBg hover:bg-tractorCard border border-tractorBorder font-bold cursor-pointer flex items-center justify-center ${idx === 0 ? 'opacity-30 pointer-events-none' : ''}" style="color: var(--text-main);">⬆️</button>
                    <button type="button" data-move-down="${idx}" class="btn-rule-down w-8 h-8 rounded-lg bg-tractorBg hover:bg-tractorCard border border-tractorBorder font-bold cursor-pointer flex items-center justify-center ${idx === totalCount - 1 ? 'opacity-30 pointer-events-none' : ''}" style="color: var(--text-main);">⬇️</button>
                    <button type="button" data-delete-rule="${idx}" class="btn-rule-delete w-8 h-8 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold cursor-pointer flex items-center justify-center transition">🗑️</button>
                </div>
            </div>
            <div>${bodyHtml}</div>
        </div>
    `;
}

function bindSingleRuleCardEvents(cfg, reRenderFn, dev, executeCommand, restartGeoFn) {
    document.querySelectorAll('.btn-rule-up').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-move-up'), 10);
            if (idx > 0) {
                const t = cfg.rulesList[idx - 1];
                cfg.rulesList[idx - 1] = cfg.rulesList[idx];
                cfg.rulesList[idx] = t;
                reRenderFn();
            }
        };
    });

    document.querySelectorAll('.btn-rule-down').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-move-down'), 10);
            if (idx < cfg.rulesList.length - 1) {
                const t = cfg.rulesList[idx + 1];
                cfg.rulesList[idx + 1] = cfg.rulesList[idx];
                cfg.rulesList[idx] = t;
                reRenderFn();
            }
        };
    });

    document.querySelectorAll('.btn-rule-delete').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-delete-rule'), 10);
            const title = RULE_CATALOG[cfg.rulesList[idx]?.type]?.title || "šią taisyklę";
            showDialog("Pašalinti taisyklę?", `Ar tikrai norite pašalinti <strong>„${title}“</strong> iš prioritetų sąrašo?`, "🗑️", () => {
                cfg.rulesList.splice(idx, 1);
                reRenderFn();
                showBottomToast("🗑️ Taisyklė pašalinta.");
            }, true);
        };
    });

    document.querySelectorAll('.rule-role-select').forEach(sel => {
        sel.onchange = () => {
            const idx = parseInt(sel.getAttribute('data-rule-role'), 10);
            if (cfg.rulesList[idx]) cfg.rulesList[idx].role = sel.value;
        };
    });

    document.querySelectorAll('.rule-param-input').forEach(inp => {
        inp.onchange = () => {
            const idx = parseInt(inp.getAttribute('data-idx'), 10);
            const param = inp.getAttribute('data-param');
            if (!cfg.rulesList[idx]) return;
            cfg.rulesList[idx].params[param] = inp.type === 'number' ? parseFloat(inp.value) : inp.value;
            if (param === 'radiusM') {
                geoZoneState = {};
                updateMapRadiusFromGeofenceRule(cfg);
                if (typeof restartGeoFn === 'function') restartGeoFn();
            }
        };
        if (inp.getAttribute('data-param') === 'radiusM') {
            inp.oninput = () => {
                const idx = parseInt(inp.getAttribute('data-idx'), 10);
                if (cfg.rulesList[idx]) {
                    cfg.rulesList[idx].params.radiusM = parseFloat(inp.value) || 25;
                    updateMapRadiusFromGeofenceRule(cfg);
                }
            };
        }
    });

    document.querySelectorAll('.rule-param-chk').forEach(chk => {
        chk.onchange = () => {
            const idx = parseInt(chk.getAttribute('data-idx'), 10);
            const param = chk.getAttribute('data-param-chk');
            if (cfg.rulesList[idx]) cfg.rulesList[idx].params[param] = chk.checked;
        };
    });

    document.querySelectorAll('.relay-sched-cell').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-rule-idx'), 10);
            const d = btn.getAttribute('data-sched-day');
            const h = parseInt(btn.getAttribute('data-sched-hour'), 10);
            const rule = cfg.rulesList[idx];
            if (!rule) return;
            const arr = rule.params.days[d] || [];
            const pos = arr.indexOf(h);
            if (pos >= 0) arr.splice(pos, 1);
            else { arr.push(h); arr.sort((a, b) => a - b); }
            rule.params.days[d] = arr;
            reRenderFn();
        };
    });

    document.querySelectorAll('.relay-day-toggle').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-rule-idx'), 10);
            const d = btn.getAttribute('data-toggle-whole-day');
            const rule = cfg.rulesList[idx];
            if (!rule) return;
            const isFull = (rule.params.days[d] || []).length >= 12;
            rule.params.days[d] = isFull ? [] : Array.from({ length: 24 }, (_, i) => i);
            reRenderFn();
        };
    });

    document.querySelectorAll('.btn-test-rule-geo').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-test-geo'), 10);
            const rule = cfg.rulesList[idx];
            const statusEl = document.getElementById(`geo-dist-status-${idx}`);
            if (!navigator.geolocation || !rule) return;
            if (statusEl) statusEl.textContent = "Matuojama...";

            navigator.geolocation.getCurrentPosition((pos) => {
                const distM = Math.round(calcDistanceMeters(pos.coords.latitude, pos.coords.longitude, cfg.lat, cfg.lng));
                const radM = Number(rule.params.radiusM || 25);
                const isEnter = rule.type === 'geofence_enter';
                const matches = isEnter ? (distM <= radM) : (distM > radM);
                if (statusEl) {
                    statusEl.innerHTML = matches
                        ? `<strong class="text-green-500">🟢 ${distM} m (Sąlyga tinka!)</strong>`
                        : `<strong class="text-amber-500">⚪ ${distM} m (Sąlyga netinka)</strong>`;
                }
                if (matches) {
                    triggerGeoAction(rule, cfg, dev, executeCommand, `📍 GPS patikra (${distM} m)`);
                }
            }, () => { if (statusEl) statusEl.textContent = "GPS klaida"; }, { enableHighAccuracy: true });
        };
    });
}

function getGeofenceRadiusFromRules(cfg) {
    const geoRule = (cfg.rulesList || []).find(r => r.type === 'geofence_enter' || r.type === 'geofence_leave');
    return geoRule ? Number(geoRule.params?.radiusM || 25) : 25;
}

function updateMapRadiusFromGeofenceRule(cfg) {
    if (!relayCircle || !relayMiniMap) return;
    if (!showRadiusCircle) {
        if (relayMiniMap.hasLayer(relayCircle)) relayMiniMap.removeLayer(relayCircle);
        return;
    }
    if (!relayMiniMap.hasLayer(relayCircle)) relayCircle.addTo(relayMiniMap);
    relayCircle.setRadius(getGeofenceRadiusFromRules(cfg));
}

function initRelayMiniMap(cfg) {
    const mapEl = document.getElementById('relay-location-mini-map');
    if (!mapEl || !window.L) return;

    if (relayMiniMap) {
        relayMiniMap.remove();
        relayMiniMap = null;
    }

    relayMiniMap = L.map('relay-location-mini-map', {
        center: [cfg.lat, cfg.lng],
        zoom: 18,
        maxZoom: 22
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 18,
        maxZoom: 22,
        attribution: '© Esri Satellite'
    }).addTo(relayMiniMap);

    const pinIcon = L.divIcon({
        className: 'custom-relay-precise-pin',
        html: `
            <div style="position:relative;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;cursor:grab;">
                <div style="background:#15803D;color:#FFFFFF;border:2px solid #FACC15;border-radius:999px;padding:1px 7px;font-size:10px;font-weight:900;white-space:nowrap;margin-bottom:3px;box-shadow:0 3px 10px rgba(0,0,0,0.8);">⚡ Relė</div>
                <div style="width:18px;height:18px;border-radius:50%;background:#FACC15;border:3px solid #15803D;box-shadow:0 0 12px rgba(250,204,21,0.95);"></div>
            </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });

    relayMarker = L.marker([cfg.lat, cfg.lng], { icon: pinIcon, draggable: true }).addTo(relayMiniMap);

    relayCircle = L.circle([cfg.lat, cfg.lng], {
        radius: getGeofenceRadiusFromRules(cfg),
        color: '#22C55E',
        fillColor: '#22C55E',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '6, 4',
        interactive: false
    }).addTo(relayMiniMap);

    relayMarker.on('dragend', (e) => {
        const pt = e.target.getLatLng();
        cfg.lat = pt.lat;
        cfg.lng = pt.lng;
        geoZoneState = {};
        updateRelayMapMarker(cfg.lat, cfg.lng, false);
    });

    relayMiniMap.on('click', (e) => {
        cfg.lat = e.latlng.lat;
        cfg.lng = e.latlng.lng;
        geoZoneState = {};
        updateRelayMapMarker(cfg.lat, cfg.lng, false);
    });

    setTimeout(() => relayMiniMap?.invalidateSize(), 150);
}

function updateRelayMapMarker(lat, lng, panTo = false) {
    if (relayMarker) relayMarker.setLatLng([lat, lng]);
    if (relayCircle) relayCircle.setLatLng([lat, lng]);
    if (panTo && relayMiniMap) relayMiniMap.setView([lat, lng], 19, { animate: true });
    const lbl = document.getElementById('lbl-relay-coords');
    if (lbl) lbl.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function toggleRelayMapFullscreen() {
    const cardEl = document.getElementById('relay-map-card-wrap');
    const mapEl = document.getElementById('relay-location-mini-map');
    const fsIcon = document.getElementById('relay-fs-icon');
    const fsText = document.getElementById('relay-fs-text');
    const fsBtn = document.getElementById('btn-relay-map-fullscreen');
    if (!cardEl || !mapEl || !relayMiniMap) return;

    isRelayMapFullscreen = !isRelayMapFullscreen;

    if (isRelayMapFullscreen) {
        cardEl.style.position = 'fixed';
        cardEl.style.inset = '0';
        cardEl.style.width = '100vw';
        cardEl.style.height = '100dvh';
        cardEl.style.zIndex = '10005';
        cardEl.style.borderRadius = '0';
        mapEl.style.flex = '1 1 auto';
        mapEl.style.height = '100%';
        if (fsIcon) fsIcon.textContent = '✕';
        if (fsText) fsText.textContent = 'Sumažinti ekraną';
        if (fsBtn) fsBtn.style.backgroundColor = '#DC2626';
    } else {
        cardEl.style.position = '';
        cardEl.style.inset = '';
        cardEl.style.width = '';
        cardEl.style.height = '';
        cardEl.style.zIndex = '';
        cardEl.style.borderRadius = '';
        mapEl.style.flex = '';
        mapEl.style.height = '300px';
        if (fsIcon) fsIcon.textContent = '⛶';
        if (fsText) fsText.textContent = 'Pilnas ekranas';
        if (fsBtn) fsBtn.style.backgroundColor = '#2E7D32';
    }

    setTimeout(() => relayMiniMap?.invalidateSize(), 150);
}

function calcDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}