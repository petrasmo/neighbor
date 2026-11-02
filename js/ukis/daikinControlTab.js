// js/ukis/daikinControlTab.js
import { showBottomToast, showDialog } from '../core/ui.js';

let hasTomorrowPricesAvailable = false;

export function renderDaikinControlTabHtml(dev, liveTelemetry, currentUser = null) {
    const cfg = dev.config || {};
    const isClimOn = liveTelemetry.climateOnOff === 'on';
    const isDhwOn = liveTelemetry.dhwOnOff === 'on';
    const isPowerfulOn = liveTelemetry.dhwPowerful === 'on';
    const curOffset = Number(liveTelemetry.currentOffset ?? -10);
    const isManualProfile = cfg.modeProfile === 'manual';

    const isAdmin = currentUser && currentUser.email === 'petrasmo@gmail.com';

    const outTempText = liveTelemetry.outdoorTemp !== null && liveTelemetry.outdoorTemp !== undefined
        ? `${liveTelemetry.outdoorTemp > 0 ? '+' : ''}${Number(liveTelemetry.outdoorTemp).toFixed(1)} °C`
        : '-- °C';
    const waterTempText = liveTelemetry.leavingWaterTemp !== null && liveTelemetry.leavingWaterTemp !== undefined
        ? `${Number(liveTelemetry.leavingWaterTemp).toFixed(1)} °C`
        : '-- °C';
    const boilerTempText = liveTelemetry.boilerTemp !== null && liveTelemetry.boilerTemp !== undefined
        ? `${Number(liveTelemetry.boilerTemp).toFixed(0)} °C`
        : '-- °C';

    const renderPowerBtn = (id, isOn, title) => `
        <button type="button" id="${id}" style="${isOn ? 'background-color: #2E7D32 !important; color: #FFFFFF !important; border: 2px solid #4CAF50 !important; box-shadow: 0 0 12px rgba(46, 125, 50, 0.5);' : 'background-color: var(--bg-surface) !important; color: #94A3B8 !important; border: 2px solid var(--border-color) !important;'}" class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shrink-0" title="${title}">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
        </button>
    `;

    const now = new Date();
    const nowTs = now.getTime();
    const isManualApproved = cfg.manualApprovalActive === true && cfg.approvedUntilTimestamp && (nowTs <= cfg.approvedUntilTimestamp);

    let manualUntilStr = "";
    if (isManualApproved) {
        const dt = new Date(cfg.approvedUntilTimestamp);
        const mStr = String(dt.getMonth() + 1).padStart(2, '0');
        const dStr = String(dt.getDate()).padStart(2, '0');
        const timePart = dt.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });

        const isSameDay = dt.getDate() === now.getDate() && dt.getMonth() === now.getMonth();
        const dayWord = isSameDay ? `ŠIANDIEN ${mStr}-${dStr}` : `RYTOJ ${mStr}-${dStr}`;
        manualUntilStr = `IKI ${dayWord} ${timePart}`;
    }

    const renderScheduleActionBtn = () => {
        if (isManualApproved) {
            return `
                <button type="button" id="btn-approve-schedule" 
                    style="background: linear-gradient(135deg, #15803d 0%, #166534 100%) !important; border: 2px solid #4ade80 !important; box-shadow: 0 0 20px rgba(34, 197, 94, 0.45) !important; color: #FFFFFF !important;"
                    class="px-5 py-2.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center gap-3 shrink-0 hover:scale-[1.02] active:scale-95 group">
                    <span class="relative flex h-3.5 w-3.5 shrink-0">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-90"></span>
                        <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                    </span>
                    <div class="text-left leading-tight">
                        <span id="lbl-approve-btn-main" style="color: #FFFFFF !important;" class="font-extrabold text-xs uppercase tracking-wider block">
                            ⚡ GRAFIKAS VYKDOMAS (${manualUntilStr})
                        </span>
                        <span style="color: #bbf7d0 !important;" class="text-[10px] font-semibold block">
                            Katilas valdomas automatiškai • Spauskite sustabdymui
                        </span>
                    </div>
                </button>
            `;
        } else {
            return `
                <button type="button" id="btn-approve-schedule" 
                    class="h-11 px-5 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2 shrink-0">
                    <span>✅</span> <span id="lbl-approve-btn-main">Patvirtinti grafiką (Vykdyti)</span>
                </button>
            `;
        }
    };

    return `
        <!-- 1. TIESIOGINIS ONECTA VALDYMAS (2 KORTELĖS) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            
            <!-- KLIMATO KONTROLĖ (GRINDYS) -->
            <div class="bg-tractorBg border ${isClimOn ? 'border-green-500/80 ring-1 ring-green-500/30' : 'border-tractorBorder'} rounded-2xl p-3 space-y-2 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        ${renderPowerBtn('btn-sheet-climate-toggle', isClimOn, isClimOn ? 'Išjungti šildymą' : 'Įjungti šildymą')}
                        <div class="min-w-0">
                            <h3 class="font-oswald text-base font-bold uppercase leading-tight truncate" style="color: var(--text-main);">Klimato Kontrolė (Grindys)</h3>
                            <span class="text-xs font-bold ${isClimOn ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}">
                                ${isClimOn ? '🟢 Įjungta (Onecta: On)' : '⚪ Išjungta (Onecta: Off)'}
                            </span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-tractorSurface border border-tractorBorder text-xs font-bold shrink-0" style="color: var(--text-main);">☀️ Šildymas</span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-tractorSurface p-2 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] text-slate-400 block font-bold uppercase">💧 Į grindis</span>
                        <strong class="font-mono text-base font-black block mt-0.5" style="color: var(--text-main);">${waterTempText}</strong>
                    </div>
                    <div class="bg-tractorSurface p-2 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] text-slate-400 block font-bold uppercase">🌤️ Lauke</span>
                        <strong class="font-mono text-base font-black text-blue-500 block mt-0.5">${outTempText}</strong>
                    </div>
                </div>

                <div class="bg-tractorSurface px-3 py-2 rounded-xl border border-tractorBorder flex items-center justify-between gap-3 text-xs">
                    <div class="flex-1 space-y-1">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-400 text-xs">Šildymo kreivės poslinkis:</span>
                            <strong id="lbl-sheet-offset" class="text-amber-500 font-mono text-sm font-black">${curOffset > 0 ? '+' : ''}${curOffset} °C</strong>
                        </div>
                        <input id="inp-sheet-offset" type="range" min="-10" max="10" step="1" value="${curOffset}" class="w-full accent-tractorPrimary cursor-pointer h-1.5">
                    </div>
                    <button type="button" id="btn-sheet-send-offset" class="h-8 px-3.5 bg-tractorPrimary text-white rounded-xl font-bold text-xs cursor-pointer shadow shrink-0">Pakeisti</button>
                </div>
            </div>

            <!-- KARŠTO VANDENS BAKAS (BOILERIS) -->
            <div class="bg-tractorBg border ${isDhwOn ? 'border-green-500/80 ring-1 ring-green-500/30' : 'border-tractorBorder'} rounded-2xl p-3 space-y-2 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        ${renderPowerBtn('btn-sheet-dhw-toggle', isDhwOn, isDhwOn ? 'Išjungti boilerį' : 'Įjungti boilerį')}
                        <div class="min-w-0">
                            <h3 class="font-oswald text-base font-bold uppercase leading-tight truncate" style="color: var(--text-main);">Karšto Vandens Bakas (Boileris)</h3>
                            <span class="text-xs font-bold ${isDhwOn ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}">
                                ${isDhwOn ? '🟢 Įjungtas (Onecta: On)' : '⚪ Išjungtas (Onecta: Off)'}
                            </span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-tractorSurface border border-tractorBorder text-xs font-bold shrink-0" style="color: var(--text-main);">🛢️ DHW Bakas</span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-tractorSurface p-2 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] text-slate-400 block font-bold uppercase">🌡️ Vanduo bake dabar</span>
                        <strong class="font-mono text-base font-black text-amber-500 block mt-0.5">${boilerTempText}</strong>
                    </div>
                    <div class="bg-tractorSurface p-2 rounded-xl border border-tractorBorder text-center">
                        <span class="text-[10px] text-slate-400 block font-bold uppercase">🎯 Palaikymo režimas</span>
                        <strong class="font-mono text-xs font-bold block mt-1" style="color: var(--text-main);">Pagal grafiką (${liveTelemetry.dhwTargetTemp || 30} °C)</strong>
                    </div>
                </div>

                <div class="bg-tractorSurface px-3 py-2 rounded-xl border border-tractorBorder flex items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-base">💪</span>
                        <div>
                            <strong class="font-bold block text-xs" style="color: var(--text-main);">Galingas režimas (Greitas užkaitinimas)</strong>
                            <span class="text-[11px] ${isPowerfulOn ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-400'}">
                                ${isPowerfulOn ? '🟢 Aktyvus – maksimaliai šildo boilerį!' : 'Išjungtas – greitas vandens paruošimas'}
                            </span>
                        </div>
                    </div>
                    ${renderPowerBtn('btn-sheet-powerful-toggle', isPowerfulOn, isPowerfulOn ? 'Išjungti galingą režimą' : 'Įjungti galingą režimą')}
                </div>
            </div>
        </div>

        <!-- 2. GRAFIKO VYKDYMAS IR SAUGUMAS -->
        <div class="bg-tractorBg border ${isManualApproved ? 'border-green-500/80 ring-1 ring-green-500/30' : 'border-tractorBorder'} p-3.5 sm:p-4 rounded-2xl space-y-3 transition-all">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/60 pb-3">
                <div class="space-y-1">
                    <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>⚡</span> Grafiko Vykdymas ir Saugumas
                        ${isManualApproved ? `<span class="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40 font-sans font-extrabold">AKTYVUS</span>` : ''}
                    </h3>
                    <p class="text-xs text-slate-400 leading-relaxed max-w-2xl">
                        Pagal nutylėjimą katilas vykdo grafiką tik žmogui patvirtinus. Pasibaigus grafikui – katilas <strong>automatiškai atstatomas į pradines reikšmes</strong> (Poslinkis: ${dev.baselineSettings?.offset ?? -10}°C, Šildymas: ${dev.baselineSettings?.climateOnOff || 'off'}).
                    </p>
                </div>

                ${renderScheduleActionBtn()}
            </div>

            <!-- 24/7 PILNOS AUTOMATIKOS VARNELĖ IR 3 PROFILIŲ PASIRINKIMAS -->
            <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-tractorSurface rounded-xl border border-tractorBorder">
                <div class="flex items-center gap-3 ${isAdmin ? '' : 'opacity-60 cursor-not-allowed'}" id="box-full-autopilot-wrapper">
                    <input type="checkbox" id="chk-full-autopilot" class="w-4 h-4 accent-tractorPrimary rounded ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed pointer-events-none'}" ${isAdmin && cfg.autopilotEnabled ? 'checked' : ''} ${isAdmin ? '' : 'disabled'}>
                    <div>
                        <label for="chk-full-autopilot" class="font-bold text-xs block ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}" style="color: var(--text-main);">
                            ⚡ Pilna automatika (24/7 Autopilotas be žmogaus patvirtinimo)
                        </label>
                        ${isAdmin
                            ? `<span class="text-[11px] text-amber-500 font-medium">👑 Jūs esate administratorius – galite įjungti nuolatinį 24/7 valdymą be rankinio patvirtinimo.</span>`
                            : `<span class="text-[11px] text-slate-400 font-medium">🔒 Saugumo sumetimais 24/7 režimas prieinamas tik administratoriui. Spauskite žalią mygtuką „Patvirtinti grafiką (Vykdyti)“ viršuje.</span>`
                        }
                    </div>
                </div>

                <!-- 3 REŽIMAI: NEGYVENAMAS | GYVENAMAS | RANKINIS (KOMFORTO) -->
                <div class="flex flex-wrap items-center gap-1 bg-tractorBg p-1 rounded-xl border border-tractorBorder shrink-0">
                    <button type="button" class="btn-sheet-profile px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${cfg.modeProfile === 'unoccupied' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" data-profile="unoccupied">
                        ❄️ Negyvenamas namas
                    </button>
                    <button type="button" class="btn-sheet-profile px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${cfg.modeProfile === 'comfort' ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" data-profile="comfort">
                        🏠 Gyvenamas
                    </button>
                    <button type="button" class="btn-sheet-profile px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${isManualProfile ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" data-profile="manual">
                        🎛️ Rankinis (Komforto)
                    </button>
                </div>
            </div>

            <!-- 🌟 SVERTŲ BLOKAS SU VISADA MATOMU MYGTUKU „💾 IŠSAUGOTI SVERTUS“! -->
            ${isManualProfile ? `
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                    <div class="sm:col-span-2 bg-tractorSurface p-3 rounded-xl border border-tractorPrimary/50 flex flex-col justify-center space-y-1">
                        <strong class="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-green-600 dark:text-green-400">
                            <span>🎛️</span> <span>Rankinis Pavalandinis Komforto Grafikas</span>
                        </strong>
                        <p class="text-[11px] text-slate-400 leading-relaxed">
                            Lentelėje žemiau ramiai sudėliokite kiekvienos valandos <strong>šildymo poslinkį</strong> ir <strong>💪 Boilerio MAX</strong> valandas, o pabaigę paspauskite dešinėje esantį mygtuką <strong>„💾 Išsaugoti svertus“</strong>.
                        </p>
                    </div>

                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder flex flex-col justify-between space-y-1.5">
                        <button type="button" id="btn-reset-manual-hours" class="w-full h-7 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-lg px-2 text-xs font-bold cursor-pointer transition flex items-center justify-center gap-1.5" style="color: var(--text-main);">
                            <span>🔄</span> <span>Standartinis šablonas</span>
                        </button>
                        <button type="button" id="btn-save-device-config" class="w-full h-7 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-lg text-xs uppercase tracking-wider transition cursor-pointer shadow">
                            💾 Išsaugoti svertus
                        </button>
                    </div>
                </div>
            ` : `
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder space-y-1">
                        <div class="flex justify-between items-center">
                            <label class="font-bold text-slate-400 text-xs">⏱️ Šildymo val. / parą:</label>
                            <strong id="lbl-sheet-hours" class="font-mono font-black text-sm text-green-600 dark:text-green-400">${cfg.allowedHoursPerDay || 4} val.</strong>
                        </div>
                        <input id="inp-sheet-hours" type="range" min="0" max="24" step="1" value="${cfg.allowedHoursPerDay || 4}" class="w-full accent-tractorPrimary cursor-pointer h-1.5">
                    </div>

                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder space-y-1">
                        <div class="flex justify-between items-center">
                            <label class="font-bold text-slate-400 text-xs">🔥 Poslinkis pigią val.:</label>
                            <strong id="lbl-sheet-cheap-offset" class="font-mono font-black text-sm" style="color: var(--text-main);">${(cfg.cheapHourOffset || -5) > 0 ? '+' : ''}${cfg.cheapHourOffset || -5} °C</strong>
                        </div>
                        <input id="inp-sheet-cheap-offset" type="range" min="-10" max="10" step="1" value="${cfg.cheapHourOffset || -5}" class="w-full accent-tractorPrimary cursor-pointer h-1.5">
                    </div>

                    <div class="bg-tractorSurface p-2.5 rounded-xl border border-tractorBorder flex flex-col justify-between space-y-1.5">
                        <select id="sel-sheet-action" class="w-full h-7 bg-tractorBg border border-tractorBorder rounded-lg px-2 text-xs font-bold outline-none cursor-pointer" style="color: var(--text-main);">
                            <option value="standby" ${cfg.normalHourAction === 'standby' ? 'selected' : ''}>💤 Brangiomis: Išjungti (0 kW)</option>
                            <option value="offset_minus_10" ${cfg.normalHourAction === 'offset_minus_10' ? 'selected' : ''}>📉 Brangiomis: Poslinkis -10 °C</option>
                            <option value="offset_minus_5" ${cfg.normalHourAction === 'offset_minus_5' ? 'selected' : ''}>📉 Brangiomis: Poslinkis -5 °C</option>
                        </select>
                        <button type="button" id="btn-save-device-config" class="w-full h-7 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-lg text-xs uppercase tracking-wider transition cursor-pointer shadow">
                            💾 Išsaugoti svertus
                        </button>
                    </div>
                </div>
            `}
        </div>

        <!-- 3. GRAFIKO LENTELĖS -->
        <div class="space-y-2 pt-1">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-tractorBorder/60 pb-1.5">
                <h3 class="font-oswald text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
                    <span>📅</span> ${isManualProfile ? 'Rankinis Komforto Grafikas (Sudėliokite valandas ir spauskite „Išsaugoti svertus“)' : 'Suplanuotas Katilo Darbo Grafikas (Šiandien ir Rytoj)'}
                </h3>
                <div class="flex items-center gap-3 text-[11px] font-bold">
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-green-500"></span> Pigiausios val.</span>
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Vidutinės</span>
                    <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> Brangiausios</span>
                </div>
            </div>
            <div id="daikin-schedule-tables-box" class="grid grid-cols-1 lg:grid-cols-2 gap-3.5"></div>
        </div>
    `;
}

function buildDefaultComfortCustomHours() {
    const map = {};
    for (let h = 0; h < 24; h++) {
        if (h >= 16 && h <= 21) {
            map[h] = { climateOnOff: 'on', offset: 1, dhwPowerful: (h === 19 || h === 20) ? 'on' : 'off' };
        } else if (h >= 6 && h <= 8) {
            map[h] = { climateOnOff: 'on', offset: 0, dhwPowerful: 'off' };
        } else {
            map[h] = { climateOnOff: 'on', offset: -3, dhwPowerful: 'off' };
        }
    }
    return map;
}

export function bindDaikinControlEvents(currentUser, dev, executeDirectCommand, onConfigSaved) {
    const isAdmin = currentUser && currentUser.email === 'petrasmo@gmail.com';
    const offsetSlider = document.getElementById('inp-sheet-offset');
    const offsetLbl = document.getElementById('lbl-sheet-offset');

    if (offsetSlider && offsetLbl) {
        offsetSlider.oninput = (e) => {
            const v = parseInt(e.target.value, 10) || 0;
            offsetLbl.textContent = `${v > 0 ? '+' + v : v} °C`;
        };
    }

    document.getElementById('btn-sheet-climate-toggle')?.addEventListener('click', () => {
        const nextState = dev.telemetry?.climateOnOff === 'on' ? 'off' : 'on';
        executeDirectCommand(
            { climateOnOff: nextState },
            nextState === 'on' ? "Grindų šildymas ĮJUNGTAS! 🔥" : "Grindų šildymas IŠJUNGTAS! 💤"
        );
    });

    document.getElementById('btn-sheet-send-offset')?.addEventListener('click', () => {
        const val = parseInt(document.getElementById('inp-sheet-offset')?.value || '0', 10);
        executeDirectCommand(
            { offset: val },
            `Šildymo poslinkis pakeistas į ${val > 0 ? '+' + val : val} °C! ⚙️`
        );
    });

    document.getElementById('btn-sheet-dhw-toggle')?.addEventListener('click', () => {
        const nextState = dev.telemetry?.dhwOnOff === 'on' ? 'off' : 'on';
        executeDirectCommand(
            { dhwOnOff: nextState },
            nextState === 'on' ? "Karšto vandens bakas (Boileris) ĮJUNGTAS! 🛢️🔥" : "Karšto vandens bakas IŠJUNGTAS! 🛢️💤"
        );
    });

    document.getElementById('btn-sheet-powerful-toggle')?.addEventListener('click', () => {
        const nextState = dev.telemetry?.dhwPowerful === 'on' ? 'off' : 'on';
        if (nextState === 'on' && dev.telemetry?.dhwOnOff !== 'on') {
            executeDirectCommand(
                { dhwOnOff: 'on', dhwPowerful: 'on' },
                "Boileris ir 💪 GALINGAS REŽIMAS įjungti!"
            );
        } else {
            executeDirectCommand(
                { dhwPowerful: nextState },
                nextState === 'on' ? "💪 Galingas režimas ĮJUNGTAS!" : "💪 Galingas režimas išjungtas."
            );
        }
    });

    document.getElementById('btn-approve-schedule')?.addEventListener('click', async () => {
        const cfg = dev.config || {};
        const nowTs = Date.now();
        const isApproved = cfg.manualApprovalActive === true && cfg.approvedUntilTimestamp && (nowTs <= cfg.approvedUntilTimestamp);

        if (isApproved) {
            cfg.manualApprovalActive = false;
            cfg.approvedUntilTimestamp = null;
            await onConfigSaved(true, cfg);
            showBottomToast("Grafiko vykdymas sustabdytas. Katilas atstatomas į bazinę būseną! 🛑");
        } else {
            const targetEnd = new Date();
            if (hasTomorrowPricesAvailable) {
                targetEnd.setDate(targetEnd.getDate() + 1);
            }
            targetEnd.setHours(23, 59, 59, 999);

            cfg.manualApprovalActive = true;
            cfg.approvedUntilTimestamp = targetEnd.getTime();
            cfg.wasRolledBack = false;

            const mStr = String(targetEnd.getMonth() + 1).padStart(2, '0');
            const dStr = String(targetEnd.getDate()).padStart(2, '0');
            const msgDay = hasTomorrowPricesAvailable ? `rytojaus (${mStr}-${dStr}) 23:59` : `šiandienos (${mStr}-${dStr}) 23:59`;

            await onConfigSaved(true, cfg);
            showBottomToast(`Grafikas patvirtintas iki ${msgDay}! Katilas dirba pagal jūsų planą 🚀⚡`);
        }
    });

    const chkFullAuto = document.getElementById('chk-full-autopilot');
    const wrapperFullAuto = document.getElementById('box-full-autopilot-wrapper');

    if (isAdmin && chkFullAuto) {
        chkFullAuto.addEventListener('change', async (e) => {
            const isChecked = e.target.checked;
            if (dev.config) {
                dev.config.autopilotEnabled = isChecked;
                if (isChecked) {
                    dev.config.wasRolledBack = false;
                }
            }
            await onConfigSaved(true, dev.config);
            showBottomToast(isChecked ? "24/7 Pilna automatika ĮJUNGTA! 🤖⚡" : "24/7 Automatika išjungta.");
        });
    } else if (!isAdmin && wrapperFullAuto) {
        wrapperFullAuto.addEventListener('click', () => {
            showBottomToast("🔒 Saugumo sumetimais 24/7 autopilotas leidžiamas tik administratoriui. Naudokite žalią mygtuką „Patvirtinti grafiką (Vykdyti)“!", "warning");
        });
    }

    const inpHours = document.getElementById('inp-sheet-hours');
    const lblHours = document.getElementById('lbl-sheet-hours');
    const inpCheapOffset = document.getElementById('inp-sheet-cheap-offset');
    const lblCheapOffset = document.getElementById('lbl-sheet-cheap-offset');

    inpHours?.addEventListener('input', (e) => {
        if (lblHours) lblHours.textContent = `${e.target.value} val.`;
        if (dev.config) dev.config.allowedHoursPerDay = parseInt(e.target.value, 10);
        onConfigSaved(false);
    });

    inpCheapOffset?.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        if (lblCheapOffset) lblCheapOffset.textContent = `${v > 0 ? '+' : ''}${v} °C`;
        if (dev.config) dev.config.cheapHourOffset = v;
        onConfigSaved(false);
    });

    // 🌟 PROFILIO PERJUNGIMAS
    document.querySelectorAll('.btn-sheet-profile').forEach(btn => {
        btn.onclick = async () => {
            const prof = btn.getAttribute('data-profile');
            if (!dev.config) dev.config = {};

            if (prof === 'unoccupied') {
                dev.config.allowedHoursPerDay = 3;
                dev.config.cheapHourOffset = -8;
                dev.config.normalHourAction = 'standby';
            } else if (prof === 'comfort') {
                dev.config.allowedHoursPerDay = 16;
                dev.config.cheapHourOffset = 1;
                dev.config.normalHourAction = 'offset_minus_5';
            } else if (prof === 'manual') {
                if (!dev.config.customHours || Object.keys(dev.config.customHours).length === 0) {
                    dev.config.customHours = buildDefaultComfortCustomHours();
                }
            }
            dev.config.modeProfile = prof;
            await onConfigSaved(true, dev.config);
        };
    });

    // Standartinio šablono užpildymas (lokaliai ekrane, be šokinėjimo)
    document.getElementById('btn-reset-manual-hours')?.addEventListener('click', () => {
        if (!dev.config) dev.config = {};
        dev.config.customHours = buildDefaultComfortCustomHours();
        onConfigSaved(false); // Pakeičia tik lentelę ekrane, bet neperkrauna viso lango!
        showBottomToast("Šablonas paruoštas! Paspauskite „💾 Išsaugoti svertus“, kad įsigaliotų.", "info");
    });

    // 🌟 VIENINTELIS MYGTUKAS, KURIS IŠSAUGO VISUS SVERTUS (IR NORD POOL, IR RANKINIO GRAFIKO VALANDAS!)
    document.getElementById('btn-save-device-config')?.addEventListener('click', async () => {
        const updatedConfig = {
            ...dev.config,
            autopilotEnabled: isAdmin ? !!dev.config.autopilotEnabled : false,
        };

        if (dev.config.modeProfile !== 'manual') {
            updatedConfig.allowedHoursPerDay = parseInt(inpHours?.value || '4', 10);
            updatedConfig.cheapHourOffset = parseInt(inpCheapOffset?.value || '-5', 10);
            updatedConfig.normalHourAction = document.getElementById('sel-sheet-action')?.value || 'standby';
        } else {
            updatedConfig.customHours = dev.config.customHours || buildDefaultComfortCustomHours();
        }

        await onConfigSaved(true, updatedConfig);
        showBottomToast("Svertai ir valandų grafikas sėkmingai išsaugoti! 💾⚡");
    });
}

export function renderDaikinScheduleGrid(dev, cachedElecHours) {
    const tablesBox = document.getElementById('daikin-schedule-tables-box');
    if (!tablesBox || !dev || cachedElecHours.length === 0) return;

    const cfg = dev.config || {};
    const isManualProfile = cfg.modeProfile === 'manual';
    if (!cfg.customHours) cfg.customHours = buildDefaultComfortCustomHours();
    const customHours = cfg.customHours;

    const allowedCount = Math.min(24, Math.max(0, cfg.allowedHoursPerDay ?? 4));
    const cheapOffset = cfg.cheapHourOffset ?? -5;

    const now = new Date();
    let todayStr = now.toLocaleDateString('lt-LT', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' });
    const currentHourInt = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Vilnius', hour: '2-digit', hour12: false }), 10);

    const dateCounts = {};
    cachedElecHours.forEach(h => { dateCounts[h.date] = (dateCounts[h.date] || 0) + 1; });
    const fullDates = Object.keys(dateCounts).filter(d => dateCounts[d] >= 20).sort();

    if (fullDates.length === 0) return;
    if (!fullDates.includes(todayStr)) todayStr = fullDates[0];

    const todayIdx = fullDates.indexOf(todayStr);
    const tomorrowStr = fullDates[todayIdx + 1] || null;

    hasTomorrowPricesAvailable = !!tomorrowStr;

    const formatCleanCt = (val) => {
        if (Math.abs(val) < 0.005) return "0";
        if (Math.abs(val) < 0.1) return parseFloat(val.toFixed(2)).toString().replace('.', ',');
        return parseFloat(val.toFixed(1)).toString().replace('.', ',');
    };

    const buildOffsetOptionsHtml = (hourRule) => {
        const isOff = hourRule.climateOnOff === 'off';
        const curOff = Number(hourRule.offset ?? 0);
        let html = `<option value="off" ${isOff ? 'selected' : ''}>💤 Išjungta (0 kW)</option>`;
        for (let v = 10; v >= -10; v--) {
            const sign = v > 0 ? `+${v}` : `${v}`;
            const sel = (!isOff && curOff === v) ? 'selected' : '';
            html += `<option value="${v}" ${sel}>🔥 Poslinkis ${sign} °C</option>`;
        }
        return html;
    };

    const buildDayTableHtml = (dateStr, titlePrefix) => {
        if (!dateStr) {
            return `
                <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden flex flex-col">
                    <div class="bg-tractorSurface px-3.5 py-2.5 border-b border-tractorBorder flex justify-between items-center">
                        <strong class="font-oswald text-sm sm:text-base uppercase tracking-wider" style="color: var(--text-main);">⏭️ RYTOJ</strong>
                        <span class="text-xs text-slate-400">Nuo 14:00–15:00 val.</span>
                    </div>
                    <div class="p-8 text-center text-xs text-slate-400 my-auto space-y-1.5">
                        <span class="text-3xl block">⏳</span>
                        <strong class="block text-sm" style="color: var(--text-main);">Rytojaus kainos dar nepaskelbtos</strong>
                        <span>Nord Pool birža kitos paros valandines kainas pateikia po 14:00 val.</span>
                    </div>
                </div>
            `;
        }

        const dayHours = cachedElecHours.filter(h => h.date === dateStr);
        const sortedDay = [...dayHours].sort((a, b) => a.priceCtNoVat - b.priceCtNoVat);
        const cheapSet = new Set(sortedDay.slice(0, allowedCount).map(h => h.hour));

        const cheapestTierSet = new Set(sortedDay.slice(0, 8).map(h => h.hour));
        const expensiveTierSet = new Set(sortedDay.slice(-8).map(h => h.hour));

        const rowsHtml = dayHours.map(h => {
            const isCurrent = (dateStr === todayStr && h.hour === currentHourInt);
            const pCt = h.priceCtNoVat;

            let priceDot = `<span class="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0"></span>`;
            let priceColorClass = `text-amber-600 dark:text-amber-400`;
            let rowBgClass = `hover:bg-tractorSurface/70`;

            if (cheapestTierSet.has(h.hour)) {
                priceDot = `<span class="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0"></span>`;
                priceColorClass = `text-green-600 dark:text-green-400`;
                rowBgClass = `bg-green-500/[0.06] hover:bg-green-500/[0.12]`;
            } else if (expensiveTierSet.has(h.hour)) {
                priceDot = `<span class="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0"></span>`;
                priceColorClass = `text-red-600 dark:text-red-400`;
                rowBgClass = `bg-red-500/[0.04] hover:bg-red-500/[0.09]`;
            }

            if (isCurrent) {
                rowBgClass = `bg-tractorPrimary/20 border-l-4 border-l-tractorPrimary font-bold`;
            }

            let actionCellHtml = "";

            if (isManualProfile) {
                const hRule = customHours[h.hour] || { climateOnOff: 'on', offset: 0, dhwPowerful: 'off' };
                const isPow = hRule.dhwPowerful === 'on';
                const isHeating = hRule.climateOnOff !== 'off';

                actionCellHtml = `
                    <div class="inline-flex items-center justify-end gap-1.5">
                        <select data-hour="${h.hour}" class="sel-manual-hour-offset h-7 rounded-lg px-2 text-[11px] font-extrabold border outline-none cursor-pointer transition ${isHeating ? 'bg-green-500/15 border-green-500/50 text-green-700 dark:text-green-300' : 'bg-tractorSurface border-tractorBorder text-slate-400'}">
                            ${buildOffsetOptionsHtml(hRule)}
                        </select>

                        <button type="button" data-hour="${h.hour}" title="Boilerio Galingas režimas (Powerful) šią valandą"
                            style="${isPow ? 'background-color: #d97706 !important; color: #FFFFFF !important; border-color: #fbbf24 !important;' : ''}"
                            class="btn-manual-hour-powerful h-7 px-2 rounded-lg border text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 shrink-0 ${isPow ? 'shadow-md' : 'bg-tractorSurface border-tractorBorder text-slate-400 hover:text-white'}">
                            <span>💪</span> <span class="hidden sm:inline">${isPow ? 'MAX' : 'Boileris'}</span>
                        </button>
                    </div>
                `;
            } else {
                const isSelectedToHeat = cheapSet.has(h.hour);
                if (isSelectedToHeat) {
                    actionCellHtml = `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/40 font-extrabold text-[11px]">
                            <span>🔥</span> <span>ŠILDYS (${cheapOffset > 0 ? '+' : ''}${cheapOffset}°C)</span>
                        </span>
                    `;
                } else {
                    let offLabel = 'IŠJUNGTA (0 kW)';
                    let offIcon = '💤';
                    if (cfg.normalHourAction === 'offset_minus_10') { offLabel = 'MIEGA (-10°C)'; offIcon = '📉'; }
                    else if (cfg.normalHourAction === 'offset_minus_5') { offLabel = 'MIEGA (-5°C)'; offIcon = '📉'; }

                    actionCellHtml = `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tractorSurface text-slate-500 dark:text-slate-400 border border-tractorBorder font-semibold text-[11px]">
                            <span>${offIcon}</span> <span>${offLabel}</span>
                        </span>
                    `;
                }
            }

            return `
                <tr class="border-b border-tractorBorder/50 transition ${rowBgClass}">
                    <td class="py-1.5 px-3 whitespace-nowrap">
                        <div class="flex items-center gap-1.5">
                            <span class="font-mono text-xs sm:text-sm font-bold" style="color: var(--text-main);">${h.hourLabel}</span>
                            ${isCurrent ? `<span class="px-1.5 py-0.5 rounded bg-tractorPrimary text-white text-[9px] font-black uppercase leading-none">Dabar</span>` : ''}
                        </div>
                    </td>
                    <td class="py-1.5 px-2 whitespace-nowrap">
                        <div class="flex items-center gap-1.5">
                            ${priceDot}
                            <span class="font-mono text-xs sm:text-sm font-black ${priceColorClass}">${formatCleanCt(pCt)}</span>
                            <span class="text-[11px] font-semibold ${priceColorClass}">ct/kWh</span>
                        </div>
                    </td>
                    <td class="py-1 px-2.5 text-right whitespace-nowrap">
                        ${actionCellHtml}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden shadow-sm">
                <div class="bg-tractorSurface px-3.5 py-2 border-b border-tractorBorder flex justify-between items-center">
                    <strong class="font-oswald text-sm sm:text-base uppercase tracking-wider" style="color: var(--text-main);">
                        ${titlePrefix} (${dateStr.slice(8)} d.)
                    </strong>
                    <span class="text-xs text-slate-400 font-mono font-bold">${dateStr}</span>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-tractorBorder bg-tractorSurface/50 text-[10px] uppercase font-bold text-slate-400">
                            <th class="py-1.5 px-3">Valanda</th>
                            <th class="py-1.5 px-2">Nord Pool kaina</th>
                            <th class="py-1.5 px-3 text-right">${isManualProfile ? 'Grindų poslinkis + Boileris 💪' : 'Katilo būsena'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    };

    tablesBox.innerHTML = `
        ${buildDayTableHtml(todayStr, '📅 ŠIANDIEN')}
        ${buildDayTableHtml(tomorrowStr, '⏭️ RYTOJ')}
    `;

    // 🌟 LOKALUS KEITIMAS BE JOKIO SERVERIO PERKROVIMO!
    // Vartotojas ramiai susidėlioja visas valandas, o į serverį įrašo tik paspaudęs „💾 Išsaugoti svertus“!
    if (isManualProfile) {
        tablesBox.querySelectorAll('.sel-manual-hour-offset').forEach(sel => {
            sel.onchange = (e) => {
                const hr = parseInt(e.target.getAttribute('data-hour'), 10);
                const val = e.target.value;
                const prev = dev.config.customHours[hr] || { climateOnOff: 'on', offset: 0, dhwPowerful: 'off' };

                if (val === 'off') {
                    dev.config.customHours[hr] = { ...prev, climateOnOff: 'off' };
                } else {
                    dev.config.customHours[hr] = { ...prev, climateOnOff: 'on', offset: parseInt(val, 10) };
                }

                // Perpiešiame tik pačią lentelę (be jokių DB užklausų ir be puslapio šokinėjimo!)
                renderDaikinScheduleGrid(dev, cachedElecHours);
            };
        });

        tablesBox.querySelectorAll('.btn-manual-hour-powerful').forEach(btn => {
            btn.onclick = () => {
                const hr = parseInt(btn.getAttribute('data-hour'), 10);
                const prev = dev.config.customHours[hr] || { climateOnOff: 'on', offset: 0, dhwPowerful: 'off' };
                const nextPow = prev.dhwPowerful === 'on' ? 'off' : 'on';

                dev.config.customHours[hr] = { ...prev, dhwPowerful: nextPow };

                // Perpiešiame tik lentelę akimirksniu!
                renderDaikinScheduleGrid(dev, cachedElecHours);
            };
        });
    }
}