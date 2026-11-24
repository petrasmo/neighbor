// js/ukis/relayControlTab.js
import { showBottomToast } from '../core/ui.js';

let relayMiniMap = null;
let relayMarker = null;
let relayCircle = null;

function getDefaultRelayConfig(cfg = {}) {
    const defaultDays = {};
    for (let d = 1; d <= 7; d++) {
        defaultDays[String(d)] = [6, 7, 8, 18, 19, 20, 21];
    }
    const r = cfg.rules || {};
    return {
        autopilotEnabled: cfg.autopilotEnabled ?? false,
        logicMode: cfg.logicMode || 'AND', // 'AND' (Visos) | 'OR' (Bet kuri)
        lat: Number(cfg.lat ?? 55.2885),
        lng: Number(cfg.lng ?? 23.9745),
        pulse: {
            enabled: cfg.pulse?.enabled ?? false,
            seconds: Number(cfg.pulse?.seconds ?? 2)
        },
        autoOffMin: {
            enabled: cfg.autoOffMin?.enabled ?? false,
            minutes: Number(cfg.autoOffMin?.minutes ?? 30)
        },
        powerGuard: {
            overloadEnabled: cfg.powerGuard?.overloadEnabled ?? true,
            overloadW: Number(cfg.powerGuard?.overloadW ?? 2500),
            idleEnabled: cfg.powerGuard?.idleEnabled ?? false,
            idleW: Number(cfg.powerGuard?.idleW ?? 15),
            idleMin: Number(cfg.powerGuard?.idleMin ?? 10)
        },
        geofence: {
            enabled: cfg.geofence?.enabled ?? false,
            radiusM: Number(cfg.geofence?.radiusM ?? 100),
            action: cfg.geofence?.action || 'pulse'
        },
        rules: {
            schedule: {
                enabled: r.schedule?.enabled ?? false,
                isStrict: r.schedule?.isStrict ?? false,
                days: r.schedule?.days || defaultDays
            },
            daylight: {
                enabled: r.daylight?.enabled ?? false,
                isStrict: r.daylight?.isStrict ?? false,
                mode: r.daylight?.mode || 'dark' // 'dark' | 'light'
            },
            precip: {
                enabled: r.precip?.enabled ?? false,
                isStrict: r.precip?.isStrict ?? true, // pagal nutylėjimą griežta apsauga (pvz. nelyja!)
                condition: r.precip?.condition || 'no_rain'
            },
            temp: {
                enabled: r.temp?.enabled ?? false,
                isStrict: r.temp?.isStrict ?? false,
                op: r.temp?.op || 'lt',
                valueC: Number(r.temp?.valueC ?? 0)
            },
            humidity: {
                enabled: r.humidity?.enabled ?? false,
                isStrict: r.humidity?.isStrict ?? true, // pvz. sandėlio ventiliacijai < 70%
                op: r.humidity?.op || 'lt',
                valuePct: Number(r.humidity?.valuePct ?? 70)
            },
            priceLimit: {
                enabled: r.priceLimit?.enabled ?? false,
                isStrict: r.priceLimit?.isStrict ?? false,
                op: r.priceLimit?.op || 'lt',
                maxCt: Number(r.priceLimit?.maxCt ?? 10.0)
            },
            cheapestHours: {
                enabled: r.cheapestHours?.enabled ?? false,
                isStrict: r.cheapestHours?.isStrict ?? false,
                count: Number(r.cheapestHours?.count ?? 4)
            }
        }
    };
}

export function renderRelayControlTabHtml(dev, tel) {
    const cfg = getDefaultRelayConfig(dev.config || {});
    const isOn = tel.fanOnOff === 'on';
    const powerW = Number(tel.powerW ?? 0);
    const voltageV = Number(tel.voltageV ?? 230);
    const totalKwh = Number(tel.totalKwh ?? 0);
    const r = cfg.rules;

    const dayNames = [
        { key: '1', label: 'Pr' },
        { key: '2', label: 'An' },
        { key: '3', label: 'Tr' },
        { key: '4', label: 'Kt' },
        { key: '5', label: 'Pn' },
        { key: '6', label: 'Št' },
        { key: '7', label: 'Sk' }
    ];

    const scheduleRowsHtml = dayNames.map(d => {
        const activeHours = r.schedule.days[d.key] || [];
        const cells = Array.from({ length: 24 }, (_, h) => {
            const active = activeHours.includes(h);
            return `
                <button type="button" data-sched-day="${d.key}" data-sched-hour="${h}"
                    class="relay-sched-cell h-6 rounded text-[9px] font-mono font-bold transition cursor-pointer border"
                    style="background: ${active ? '#2E7D32' : 'var(--bg-surface)'}; color: ${active ? '#FFFFFF' : 'var(--text-muted)'}; border-color: ${active ? '#1B5E20' : 'var(--border-color)'};">
                    ${String(h).padStart(2, '0')}
                </button>
            `;
        }).join('');

        return `
            <div class="flex items-center gap-1.5">
                <button type="button" data-toggle-whole-day="${d.key}" class="relay-day-toggle w-8 h-6 rounded bg-tractorSurface border border-tractorBorder text-[10px] font-extrabold cursor-pointer shrink-0" style="color: var(--text-main);" title="Pažymėti / nužymėti visą dieną">${d.label}</button>
                <div class="grid grid-cols-12 sm:grid-cols-24 gap-0.5 flex-1" style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));">
                    ${cells}
                </div>
            </div>
        `;
    }).join('');

    return `
        <!-- 1. RANKINIS VALDYMAS, IMPULSAS IR GYVI DAVIKLIAI -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div class="lg:col-span-2 bg-tractorBg border-2 ${isOn ? 'border-green-500' : 'border-tractorBorder'} rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">⚡ Shelly Relės Būsena</span>
                        <strong class="font-oswald text-2xl font-black uppercase ${isOn ? 'text-green-500' : 'text-slate-400'}">
                            ${isOn ? '🟢 ĮJUNGTA (ON)' : '⚪ IŠJUNGTA (OFF)'}
                        </strong>
                        ${tel.lastRuleDecision ? `<span class="block text-[11px] text-amber-400 font-semibold mt-0.5">🤖 Paskutinis sprendimas: ${tel.lastRuleDecision}</span>` : ''}
                    </div>

                    <div class="flex flex-wrap gap-2">
                        <button type="button" id="btn-relay-turn-on" class="h-10 px-4 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase shadow cursor-pointer transition">
                            ⚡ Įjungti (ON)
                        </button>
                        <button type="button" id="btn-relay-turn-off" class="h-10 px-4 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs uppercase shadow cursor-pointer transition">
                            ⏻ Išjungti (OFF)
                        </button>
                        <button type="button" id="btn-relay-pulse-now" class="h-10 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase shadow cursor-pointer transition" title="Trumpas impulsas vartams arba užraktui">
                            🚪 Impulsas (${cfg.pulse.seconds} s)
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-2 pt-2 border-t border-tractorBorder/60 text-xs">
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                        <span class="text-[10px] text-slate-400 uppercase font-bold block">Galia dabar</span>
                        <strong class="font-mono font-black text-base text-amber-500">${powerW} W</strong>
                    </div>
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                        <span class="text-[10px] text-slate-400 uppercase font-bold block">Įtampa</span>
                        <strong class="font-mono font-bold text-base" style="color: var(--text-main);">${voltageV} V</strong>
                    </div>
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder">
                        <span class="text-[10px] text-slate-400 uppercase font-bold block">Skaitiklis</span>
                        <strong class="font-mono font-bold text-base text-green-500">${totalKwh.toFixed(2)} kWh</strong>
                    </div>
                </div>
            </div>

            <!-- AUTOPILOTO IR PRIORITETŲ VALDIKLIS -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 flex flex-col justify-between space-y-3 text-xs">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <strong class="font-oswald text-base uppercase" style="color: var(--text-main);">🤖 Taisyklių Autopilotas</strong>
                        <input type="checkbox" id="chk-relay-autopilot" class="w-5 h-5 accent-tractorPrimary cursor-pointer" ${cfg.autopilotEnabled ? 'checked' : ''}>
                    </div>
                    <p class="text-[11px] text-slate-400">
                        Serveris kas 15 min. tikrina visas įjungtas taisykles. <strong>🔴 Griežtos taisyklės</strong> visada blokuoja įjungimą!
                    </p>
                </div>

                <div class="space-y-1">
                    <label class="text-[10px] font-bold uppercase text-slate-400 block">🟡 Darbinių taisyklių jungimas:</label>
                    <select id="sel-relay-logic-mode" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-xl px-2.5 font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                        <option value="AND" ${cfg.logicMode === 'AND' ? 'selected' : ''}>🔗 VISOS įjungtos taisyklės turi sutapti (IR)</option>
                        <option value="OR" ${cfg.logicMode === 'OR' ? 'selected' : ''}>🔀 Užtenka BET KURIOS taisyklės (ARBA)</option>
                    </select>
                </div>

                <button type="button" id="btn-save-relay-rules" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer transition">
                    💾 Išsaugoti Visas Taisykles
                </button>
            </div>
        </div>

        <!-- 2. RELĖS VIETA ŽEMĖLAPYJE + TELEFONO GPS ARTUMAS (VARTAMS) -->
        <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 space-y-3 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                <div>
                    <h4 class="font-oswald text-base font-bold uppercase flex items-center gap-1.5" style="color: var(--text-main);">
                        <span>📍</span> Relės Vieta Žemėlapyje (Orams ir GPS Vartams)
                    </h4>
                    <span class="text-[11px] text-slate-400">Spustelėkite ant žemėlapio, kur stovi jūsų relė (pvz., vartai, sandėlis, šiltnamis).</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span id="lbl-relay-coords" class="font-mono text-[11px] text-green-400 font-bold">${cfg.lat.toFixed(5)}, ${cfg.lng.toFixed(5)}</span>
                    <button type="button" id="btn-relay-set-my-gps" class="h-8 px-3 bg-tractorSurface hover:bg-tractorPrimary hover:text-white border border-tractorBorder rounded-lg font-bold text-[11px] cursor-pointer transition" style="color: var(--text-main);">
                        📡 Padėti mano vietoje
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 items-center">
                <div class="lg:col-span-2">
                    <div id="relay-location-mini-map" style="width: 100%; height: 220px; min-height: 220px; border-radius: 12px; border: 1px solid var(--border-color); z-index: 10; background: #0f1712;"></div>
                </div>

                <div class="bg-tractorSurface border border-tractorBorder rounded-xl p-3 space-y-2.5">
                    <label class="flex items-center justify-between font-bold cursor-pointer" style="color: var(--text-main);">
                        <span>📱 GPS Artumas (Geofence)</span>
                        <input type="checkbox" id="chk-rule-geo" class="w-4 h-4 accent-tractorPrimary" ${cfg.geofence.enabled ? 'checked' : ''}>
                    </label>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[10px] text-slate-400 block">Spindulys (m)</label>
                            <input id="inp-geo-radius" type="number" step="10" min="20" max="2000" value="${cfg.geofence.radiusM}" class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold outline-none" style="color: var(--text-main);">
                        </div>
                        <div>
                            <label class="text-[10px] text-slate-400 block">Veiksmas priartėjus</label>
                            <select id="sel-geo-action" class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-bold outline-none" style="color: var(--text-main);">
                                <option value="pulse" ${cfg.geofence.action === 'pulse' ? 'selected' : ''}>🚪 Impulsas</option>
                                <option value="on" ${cfg.geofence.action === 'on' ? 'selected' : ''}>⚡ Įjungti ON</option>
                            </select>
                        </div>
                    </div>
                    <button type="button" id="btn-check-geo-distance" class="w-full h-9 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] uppercase cursor-pointer transition">
                        📡 Patikrinti atstumą nuo mano telefono
                    </button>
                    <span id="lbl-geo-distance-res" class="text-[10px] text-slate-400 block text-center">Paspauskite atstumui patikrinti</span>
                </div>
            </div>
        </div>

        <!-- 3. VISOS AUTOMATIZAVIMO TAISYKLĖS (KORTELIŲ TINKLELIS) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            
            <!-- A. NORD POOL KAINOS RIBA -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 space-y-2.5">
                <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-2">
                    <label class="font-bold flex items-center gap-1.5 cursor-pointer" style="color: var(--text-main);">
                        <input type="checkbox" id="chk-rule-price" class="w-4 h-4 accent-tractorPrimary" ${r.priceLimit.enabled ? 'checked' : ''}>
                        <span>⚡ Nord Pool Kainos Riba</span>
                    </label>
                    <label class="text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer" title="Griežta taisyklė blokuoja įjungimą">
                        <input type="checkbox" id="strict-rule-price" class="accent-red-500" ${r.priceLimit.isStrict ? 'checked' : ''}> 🔒 Griežta
                    </label>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <select id="sel-price-op" class="h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 font-bold" style="color: var(--text-main);">
                        <option value="lt" ${r.priceLimit.op === 'lt' ? 'selected' : ''}>Žemiau (≤)</option>
                        <option value="gt" ${r.priceLimit.op === 'gt' ? 'selected' : ''}>Aukščiau (&gt;)</option>
                    </select>
                    <div class="flex items-center gap-1">
                        <input id="inp-price-ct" type="number" step="0.5" value="${r.priceLimit.maxCt}" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 font-mono font-bold" style="color: var(--text-main);">
                        <span class="text-slate-400 font-bold">ct</span>
                    </div>
                </div>
            </div>

            <!-- B. NORD POOL TOP-N PIGIAUSIOS VALANDOS -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 space-y-2.5">
                <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-2">
                    <label class="font-bold flex items-center gap-1.5 cursor-pointer" style="color: var(--text-main);">
                        <input type="checkbox" id="chk-rule-cheapest" class="w-4 h-4 accent-tractorPrimary" ${r.cheapestHours.enabled ? 'checked' : ''}>
                        <span>🏆 N Pigiausių Valandų / Parą</span>
                    </label>
                    <label class="text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" id="strict-rule-cheapest" class="accent-red-500" ${r.cheapestHours.isStrict ? 'checked' : ''}> 🔒 Griežta
                    </label>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <span class="text-slate-400">Įjungti pigiausias val.:</span>
                    <div class="flex items-center gap-1.5">
                        <input id="inp-cheapest-n" type="number" min="1" max="24" value="${r.cheapestHours.count}" class="w-16 h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 font-mono font-bold text-center" style="color: var(--text-main);">
                        <span class="font-bold text-green-500">val./parą</span>
                    </div>
                </div>
            </div>

            <!-- C. ŠVIESU / SUTEMUS -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 space-y-2.5">
                <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-2">
                    <label class="font-bold flex items-center gap-1.5 cursor-pointer" style="color: var(--text-main);">
                        <input type="checkbox" id="chk-rule-daylight" class="w-4 h-4 accent-tractorPrimary" ${r.daylight.enabled ? 'checked' : ''}>
                        <span>🌗 Šviesu / Sutemus</span>
                    </label>
                    <label class="text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" id="strict-rule-daylight" class="accent-red-500" ${r.daylight.isStrict ? 'checked' : ''}> 🔒 Griežta
                    </label>
                </div>
                <select id="sel-daylight-mode" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 font-bold" style="color: var(--text-main);">
                    <option value="dark" ${r.daylight.mode === 'dark' ? 'selected' : ''}>🌙 Įjungti kai sutemus (po saulėlydžio)</option>
                    <option value="light" ${r.daylight.mode === 'light' ? 'selected' : ''}>☀️ Įjungti kai šviesu (dieną)</option>
                </select>
            </div>

            <!-- D. KRITULIAI (LIETUS / SNIEGAS) -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 space-y-2.5">
                <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-2">
                    <label class="font-bold flex items-center gap-1.5 cursor-pointer" style="color: var(--text-main);">
                        <input type="checkbox" id="chk-rule-precip" class="w-4 h-4 accent-tractorPrimary" ${r.precip.enabled ? 'checked' : ''}>
                        <span>🌧️ Lietus ir Sniegas</span>
                    </label>
                    <label class="text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" id="strict-rule-precip" class="accent-red-500" ${r.precip.isStrict ? 'checked' : ''}> 🔒 Griežta
                    </label>
                </div>
                <select id="sel-precip-cond" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2.5 font-bold" style="color: var(--text-main);">
                    <option value="no_rain" ${r.precip.condition === 'no_rain' ? 'selected' : ''}>☀️ Tik kai NELYJA (laistymui)</option>
                    <option value="rain" ${r.precip.condition === 'rain' ? 'selected' : ''}>🌧️ Kai LYJA</option>
                    <option value="snow" ${r.precip.condition === 'snow' ? 'selected' : ''}>❄️ Kai SNINGA (stogo/latakų šildymui)</option>
                    <option value="no_snow" ${r.precip.condition === 'no_snow' ? 'selected' : ''}>🌤️ Tik kai NESNINGA</option>
                </select>
            </div>

            <!-- E. LAUKO ORO TEMPERATŪRA -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 space-y-2.5">
                <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-2">
                    <label class="font-bold flex items-center gap-1.5 cursor-pointer" style="color: var(--text-main);">
                        <input type="checkbox" id="chk-rule-temp" class="w-4 h-4 accent-tractorPrimary" ${r.temp.enabled ? 'checked' : ''}>
                        <span>🌡️ Lauko Temperatūra</span>
                    </label>
                    <label class="text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" id="strict-rule-temp" class="accent-red-500" ${r.temp.isStrict ? 'checked' : ''}> 🔒 Griežta
                    </label>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <select id="sel-temp-op" class="h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 font-bold" style="color: var(--text-main);">
                        <option value="lt" ${r.temp.op === 'lt' ? 'selected' : ''}>Žemiau (&lt;)</option>
                        <option value="gt" ${r.temp.op === 'gt' ? 'selected' : ''}>Aukščiau (&gt;)</option>
                    </select>
                    <div class="flex items-center gap-1">
                        <input id="inp-temp-val" type="number" step="0.5" value="${r.temp.valueC}" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 font-mono font-bold" style="color: var(--text-main);">
                        <span class="text-slate-400 font-bold">°C</span>
                    </div>
                </div>
            </div>

            <!-- F. LAUKO ORO DRĖGMĖ (SANDĖLIUI / MALKINEI) -->
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 space-y-2.5">
                <div class="flex items-center justify-between border-b border-tractorBorder/60 pb-2">
                    <label class="font-bold flex items-center gap-1.5 cursor-pointer" style="color: var(--text-main);">
                        <input type="checkbox" id="chk-rule-hum" class="w-4 h-4 accent-tractorPrimary" ${r.humidity.enabled ? 'checked' : ''}>
                        <span>💧 Lauko Drėgmė (Ventiliacijai)</span>
                    </label>
                    <label class="text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" id="strict-rule-hum" class="accent-red-500" ${r.humidity.isStrict ? 'checked' : ''}> 🔒 Griežta
                    </label>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <select id="sel-hum-op" class="h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 font-bold" style="color: var(--text-main);">
                        <option value="lt" ${r.humidity.op === 'lt' ? 'selected' : ''}>Žemiau (&lt;)</option>
                        <option value="gt" ${r.humidity.op === 'gt' ? 'selected' : ''}>Aukščiau (&gt;)</option>
                    </select>
                    <div class="flex items-center gap-1">
                        <input id="inp-hum-val" type="number" step="1" min="10" max="100" value="${r.humidity.valuePct}" class="w-full h-9 bg-tractorSurface border border-tractorBorder rounded-lg px-2 font-mono font-bold" style="color: var(--text-main);">
                        <span class="text-slate-400 font-bold">%</span>
                    </div>
                </div>
            </div>

        </div>

        <!-- 4. IMPULSAS, LAIKMATIS IR GALIOS (W) APSAUGA -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 space-y-2.5">
                <h4 class="font-oswald text-sm font-bold uppercase" style="color: var(--text-main);">⏱️ Impulsas Vartams ir Apsauginis Laikmatis</h4>
                <div class="grid grid-cols-2 gap-2.5">
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder space-y-1">
                        <label class="text-[10px] font-bold text-amber-400 uppercase block">🚪 Impulso trukmė (sek.)</label>
                        <input id="inp-pulse-sec" type="number" min="1" max="30" value="${cfg.pulse.seconds}" class="w-full h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold" style="color: var(--text-main);">
                    </div>
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder space-y-1">
                        <label class="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" id="chk-auto-off" class="accent-tractorPrimary" ${cfg.autoOffMin.enabled ? 'checked' : ''}>
                            <span>Auto-OFF (po min.)</span>
                        </label>
                        <input id="inp-auto-off-min" type="number" min="1" max="720" value="${cfg.autoOffMin.minutes}" class="w-full h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold" style="color: var(--text-main);">
                    </div>
                </div>
            </div>

            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 space-y-2.5">
                <h4 class="font-oswald text-sm font-bold uppercase text-red-400">🛡️ Galios (W) Apsauga ir Baigto Darbo Aptikimas</h4>
                <div class="grid grid-cols-2 gap-2.5">
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder space-y-1">
                        <label class="text-[10px] font-bold text-red-400 uppercase flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" id="chk-overload" class="accent-red-500" ${cfg.powerGuard.overloadEnabled ? 'checked' : ''}>
                            <span>Perkrova (&gt; W)</span>
                        </label>
                        <input id="inp-overload-w" type="number" step="50" value="${cfg.powerGuard.overloadW}" class="w-full h-8 bg-tractorBg border border-tractorBorder rounded-lg px-2 font-mono font-bold" style="color: var(--text-main);">
                    </div>
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder space-y-1">
                        <label class="text-[10px] font-bold text-green-400 uppercase flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" id="chk-idle-off" class="accent-tractorPrimary" ${cfg.powerGuard.idleEnabled ? 'checked' : ''}>
                            <span>Baigė darbą (&lt; W / min)</span>
                        </label>
                        <div class="flex gap-1">
                            <input id="inp-idle-w" type="number" value="${cfg.powerGuard.idleW}" class="w-1/2 h-8 bg-tractorBg border border-tractorBorder rounded-lg px-1.5 font-mono font-bold" style="color: var(--text-main);" title="Watai">
                            <input id="inp-idle-min" type="number" value="${cfg.powerGuard.idleMin}" class="w-1/2 h-8 bg-tractorBg border border-tractorBorder rounded-lg px-1.5 font-mono font-bold" style="color: var(--text-main);" title="Minutės">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. SAVAITINIS 7x24 TVARKARAŠTIS (PR–SK, KAS VALANDĄ) -->
        <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-4 space-y-3 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                <label class="font-oswald text-base font-bold uppercase flex items-center gap-2 cursor-pointer" style="color: var(--text-main);">
                    <input type="checkbox" id="chk-rule-schedule" class="w-4 h-4 accent-tractorPrimary" ${r.schedule.enabled ? 'checked' : ''}>
                    <span>🗓️ Savaitinis Tvarkaraštis (Pr–Sk, 00:00–23:00)</span>
                </label>
                <div class="flex items-center gap-3">
                    <span class="text-[10px] text-slate-400">Žalia = ĮJUNGTA • Spauskite ant valandos arba dienos</span>
                    <label class="text-[10px] font-bold text-red-400 flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" id="strict-rule-schedule" class="accent-red-500" ${r.schedule.isStrict ? 'checked' : ''}> 🔒 Griežta
                    </label>
                </div>
            </div>
            <div class="space-y-1.5">
                ${scheduleRowsHtml}
            </div>
        </div>
    `;
}

export function bindRelayControlEvents(currentUser, dev, executeCommand, onConfigSaved) {
    const cfg = getDefaultRelayConfig(dev.config || {});

    // 1. Mini-žemėlapis relės vietai pažymėti
    setTimeout(() => initRelayMiniMap(cfg), 100);

    // 2. Savaitinio tvarkaraščio paspaudimai
    document.querySelectorAll('.relay-sched-cell').forEach(btn => {
        btn.onclick = () => {
            const d = btn.getAttribute('data-sched-day');
            const h = parseInt(btn.getAttribute('data-sched-hour'), 10);
            const arr = cfg.rules.schedule.days[d] || [];
            const idx = arr.indexOf(h);
            if (idx >= 0) {
                arr.splice(idx, 1);
                btn.style.background = 'var(--bg-surface)';
                btn.style.color = 'var(--text-muted)';
                btn.style.borderColor = 'var(--border-color)';
            } else {
                arr.push(h);
                arr.sort((a, b) => a - b);
                btn.style.background = '#2E7D32';
                btn.style.color = '#FFFFFF';
                btn.style.borderColor = '#1B5E20';
            }
            cfg.rules.schedule.days[d] = arr;
        };
    });

    document.querySelectorAll('.relay-day-toggle').forEach(btn => {
        btn.onclick = () => {
            const d = btn.getAttribute('data-toggle-whole-day');
            const isFull = (cfg.rules.schedule.days[d] || []).length >= 12;
            cfg.rules.schedule.days[d] = isFull ? [] : Array.from({ length: 24 }, (_, i) => i);
            document.querySelectorAll(`.relay-sched-cell[data-sched-day="${d}"]`).forEach(cell => {
                const active = !isFull;
                cell.style.background = active ? '#2E7D32' : 'var(--bg-surface)';
                cell.style.color = active ? '#FFFFFF' : 'var(--text-muted)';
                cell.style.borderColor = active ? '#1B5E20' : 'var(--border-color)';
            });
        };
    });

    // 3. Tiesioginis valdymas (ON / OFF / Impulsas)
    document.getElementById('btn-relay-turn-on')?.addEventListener('click', () => {
        const autoOff = document.getElementById('chk-auto-off')?.checked;
        const autoMin = parseInt(document.getElementById('inp-auto-off-min')?.value || '30', 10);
        executeCommand({
            deviceDocId: dev.id,
            fanOnOff: 'on',
            timerSec: autoOff ? autoMin * 60 : 0
        }, autoOff ? `⚡ Relė įjungta (Auto-OFF po ${autoMin} min.)!` : '⚡ Relė įjungta (ON)!');
    });

    document.getElementById('btn-relay-turn-off')?.addEventListener('click', () => {
        executeCommand({ deviceDocId: dev.id, fanOnOff: 'off' }, '⏻ Relė išjungta (OFF)!');
    });

    document.getElementById('btn-relay-pulse-now')?.addEventListener('click', () => {
        const sec = Math.max(1, parseInt(document.getElementById('inp-pulse-sec')?.value || '2', 10));
        executeCommand({ deviceDocId: dev.id, fanOnOff: 'on', timerSec: sec }, `🚪 Išsiųstas ${sec} sek. impulsas!`);
    });

    // 4. Padėti relę dabartinėje telefono GPS vietoje
    document.getElementById('btn-relay-set-my-gps')?.addEventListener('click', () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            cfg.lat = pos.coords.latitude;
            cfg.lng = pos.coords.longitude;
            updateRelayMapMarker(cfg.lat, cfg.lng, Number(document.getElementById('inp-geo-radius')?.value || 100));
            showBottomToast("📍 Relės vieta atnaujinta pagal jūsų GPS! Paspauskite „Išsaugoti“.");
        }, () => showBottomToast("Nepavyko gauti telefono GPS.", "error"));
    });

    // 5. Patikrinti telefono atstumą (Geofence)
    document.getElementById('btn-check-geo-distance')?.addEventListener('click', () => {
        if (!navigator.geolocation) return;
        const resLbl = document.getElementById('lbl-geo-distance-res');
        if (resLbl) resLbl.textContent = "Nustatoma jūsų vieta...";

        navigator.geolocation.getCurrentPosition((pos) => {
            const distM = Math.round(calcDistanceMeters(pos.coords.latitude, pos.coords.longitude, cfg.lat, cfg.lng));
            const radM = Number(document.getElementById('inp-geo-radius')?.value || 100);
            const inside = distM <= radM;

            if (resLbl) {
                resLbl.innerHTML = inside
                    ? `<strong class="text-green-400">🟢 Esate zonoje! Atstumas: ${distM} m (≤ ${radM} m)</strong>`
                    : `<strong class="text-amber-400">⚪ Už zonos ribų: ${distM} m (Spindulys ${radM} m)</strong>`;
            }

            if (inside && document.getElementById('chk-rule-geo')?.checked) {
                const act = document.getElementById('sel-geo-action')?.value || 'pulse';
                const sec = act === 'pulse' ? Number(document.getElementById('inp-pulse-sec')?.value || 2) : 0;
                executeCommand({ deviceDocId: dev.id, fanOnOff: 'on', timerSec: sec }, `📍 GPS zonoje (${distM} m) -> Komanda išsiųsta!`);
            }
        }, () => {
            if (resLbl) resLbl.textContent = "Nepavyko nuskaityti GPS.";
        });
    });

    document.getElementById('inp-geo-radius')?.addEventListener('input', (e) => {
        const rad = Number(e.target.value || 100);
        if (relayCircle) relayCircle.setRadius(rad);
    });

    // 6. Išsaugoti visas taisykles į Firestore
    document.getElementById('btn-save-relay-rules')?.addEventListener('click', async () => {
        const newConfig = {
            autopilotEnabled: !!document.getElementById('chk-relay-autopilot')?.checked,
            logicMode: document.getElementById('sel-relay-logic-mode')?.value || 'AND',
            lat: cfg.lat,
            lng: cfg.lng,
            pulse: {
                enabled: true,
                seconds: Number(document.getElementById('inp-pulse-sec')?.value || 2)
            },
            autoOffMin: {
                enabled: !!document.getElementById('chk-auto-off')?.checked,
                minutes: Number(document.getElementById('inp-auto-off-min')?.value || 30)
            },
            powerGuard: {
                overloadEnabled: !!document.getElementById('chk-overload')?.checked,
                overloadW: Number(document.getElementById('inp-overload-w')?.value || 2500),
                idleEnabled: !!document.getElementById('chk-idle-off')?.checked,
                idleW: Number(document.getElementById('inp-idle-w')?.value || 15),
                idleMin: Number(document.getElementById('inp-idle-min')?.value || 10)
            },
            geofence: {
                enabled: !!document.getElementById('chk-rule-geo')?.checked,
                radiusM: Number(document.getElementById('inp-geo-radius')?.value || 100),
                action: document.getElementById('sel-geo-action')?.value || 'pulse'
            },
            rules: {
                schedule: {
                    enabled: !!document.getElementById('chk-rule-schedule')?.checked,
                    isStrict: !!document.getElementById('strict-rule-schedule')?.checked,
                    days: cfg.rules.schedule.days
                },
                daylight: {
                    enabled: !!document.getElementById('chk-rule-daylight')?.checked,
                    isStrict: !!document.getElementById('strict-rule-daylight')?.checked,
                    mode: document.getElementById('sel-daylight-mode')?.value || 'dark'
                },
                precip: {
                    enabled: !!document.getElementById('chk-rule-precip')?.checked,
                    isStrict: !!document.getElementById('strict-rule-precip')?.checked,
                    condition: document.getElementById('sel-precip-cond')?.value || 'no_rain'
                },
                temp: {
                    enabled: !!document.getElementById('chk-rule-temp')?.checked,
                    isStrict: !!document.getElementById('strict-rule-temp')?.checked,
                    op: document.getElementById('sel-temp-op')?.value || 'lt',
                    valueC: Number(document.getElementById('inp-temp-val')?.value ?? 0)
                },
                humidity: {
                    enabled: !!document.getElementById('chk-rule-hum')?.checked,
                    isStrict: !!document.getElementById('strict-rule-hum')?.checked,
                    op: document.getElementById('sel-hum-op')?.value || 'lt',
                    valuePct: Number(document.getElementById('inp-hum-val')?.value ?? 70)
                },
                priceLimit: {
                    enabled: !!document.getElementById('chk-rule-price')?.checked,
                    isStrict: !!document.getElementById('strict-rule-price')?.checked,
                    op: document.getElementById('sel-price-op')?.value || 'lt',
                    maxCt: Number(document.getElementById('inp-price-ct')?.value ?? 10)
                },
                cheapestHours: {
                    enabled: !!document.getElementById('chk-rule-cheapest')?.checked,
                    isStrict: !!document.getElementById('strict-rule-cheapest')?.checked,
                    count: Number(document.getElementById('inp-cheapest-n')?.value ?? 4)
                }
            }
        };

        await onConfigSaved(true, newConfig);
        showBottomToast("⚡ Visos Shelly relės taisyklės ir GPS vieta išsaugotos!");
    });
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
        zoom: 16
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri Satellite'
    }).addTo(relayMiniMap);

    relayMarker = L.marker([cfg.lat, cfg.lng]).addTo(relayMiniMap);
    relayCircle = L.circle([cfg.lat, cfg.lng], {
        radius: cfg.geofence.radiusM || 100,
        color: '#22C55E',
        fillColor: '#22C55E',
        fillOpacity: 0.15,
        weight: 2
    }).addTo(relayMiniMap);

    relayMiniMap.on('click', (e) => {
        cfg.lat = e.latlng.lat;
        cfg.lng = e.latlng.lng;
        updateRelayMapMarker(cfg.lat, cfg.lng, Number(document.getElementById('inp-geo-radius')?.value || 100));
    });

    setTimeout(() => relayMiniMap?.invalidateSize(), 150);
}

function updateRelayMapMarker(lat, lng, radiusM) {
    if (relayMarker) relayMarker.setLatLng([lat, lng]);
    if (relayCircle) {
        relayCircle.setLatLng([lat, lng]);
        relayCircle.setRadius(radiusM);
    }
    if (relayMiniMap) relayMiniMap.setView([lat, lng], 16, { animate: true });
    const lbl = document.getElementById('lbl-relay-coords');
    if (lbl) lbl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function calcDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}