// js/skaiciuokles/fertilizerBarometer.js
import { db } from '../core/firebase.js';

let cachedBarometerData = null;
let activeCommodity = 'gasTTF'; // 'gasTTF', 'currency', 'ureaFOB'
let activeRange = '6M';
let hoveredPoint = null;
let unsubscribeBarometer = null;

const COMMODITY_CONFIG = {
    gasTTF: {
        id: 'gasTTF',
        name: 'Olandijos TTF Gamtinės Dujos',
        unit: '€/MWh',
        icon: '⚡',
        color: '#16A34A',
        desc: 'Pagrindinis azoto (salietros ir KAS-32) gamybos sąnaudų variklis Europoje.'
    },
    currency: {
        id: 'currency',
        name: 'EUR / USD Valiutos Kursas',
        unit: 'USD',
        icon: '💶',
        color: '#2563EB',
        desc: 'Importuojamų žaliavų ir pasaulinių trąšų atvežimo valiutos santykis.'
    },
    ureaFOB: {
        id: 'ureaFOB',
        name: 'Pasaulinis Karbamido Indeksas (Urea FOB)',
        unit: '$/t',
        icon: '🧪',
        color: '#D97706',
        desc: 'Pasaulinis granuliuoto azoto etalonas, kurį vėluodama atkartoja Lietuvos salietros kaina.'
    }
};

export function renderFertilizerBarometer(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6 max-w-6xl mx-auto w-full">
            
            <!-- HEADERIS -->
            <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
                
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-4">
                    <div class="space-y-1">
                        <div class="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                            <span>Gyva rinka • 5 Piliastrų Analitika</span>
                        </div>
                        <h2 class="font-oswald text-2xl md:text-3xl font-bold tracking-wide" style="color: var(--text-main);">
                            🧭 Trąšų Kainų Radaras ir Barometras
                        </h2>
                        <p class="text-xs md:text-sm mt-0.5" style="color: var(--text-muted);">
                            Išankstinė azoto ir NPK trąšų kainų kryptis pagal dujas, valiutas, pasaulinį karbamidą ir pirkimo galios santykį.
                        </p>
                    </div>

                    <div class="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-500 dark:text-slate-400">
                        <span id="baro-sync-time">Kraunama iš biržos...</span>
                    </div>
                </div>

                <!-- 1. SPIDOMETRO IR VERDIKTO KORTELĖ -->
                <div id="baro-verdict-card" class="rounded-2xl p-6 md:p-8 border-2 space-y-4 shadow-2xl transition-all">
                    <div class="text-center py-6 text-slate-400 text-xs">Kraunamas rinkos spidometras...</div>
                </div>

                <!-- 2. GRAFIKO BLOKAS SU 3 MYGTUKAIS -->
                <div class="space-y-4 bg-tractorBg/90 border border-tractorBorder p-5 md:p-6 rounded-2xl">
                    
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-tractorBorder/60 pb-4">
                        <!-- 3 ŽALIAVŲ PERJUNGIKLIS -->
                        <div class="flex items-center gap-1.5 bg-tractorSurface p-1.5 rounded-xl border border-tractorBorder">
                            <button type="button" class="btn-baro-comm px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer" data-comm="gasTTF">
                                <span>⚡</span> <span>TTF Dujos</span>
                            </button>
                            <button type="button" class="btn-baro-comm px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer" data-comm="currency">
                                <span>💶</span> <span>EUR / USD</span>
                            </button>
                            <button type="button" class="btn-baro-comm px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer" data-comm="ureaFOB">
                                <span>🧪</span> <span>Karbamidas</span>
                            </button>
                        </div>

                        <!-- PERIODŲ MYGTUKAI -->
                        <div class="flex items-center gap-1 bg-tractorSurface p-1 rounded-xl border border-tractorBorder self-start lg:self-auto">
                            <button type="button" class="btn-baro-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="1W">1 sav.</button>
                            <button type="button" class="btn-baro-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="1M">1 mėn.</button>
                            <button type="button" class="btn-baro-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="3M">3 mėn.</button>
                            <button type="button" class="btn-baro-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="6M">6 mėn.</button>
                            <button type="button" class="btn-baro-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="1Y">1 m.</button>
                        </div>
                    </div>

                    <!-- GRAFIKO ANTRAŠTĖ IR UŽVEDIMO REIKŠMĖ -->
                    <div class="flex justify-between items-center px-1">
                        <div class="flex items-center gap-2">
                            <strong id="baro-chart-title" class="text-sm font-bold" style="color: var(--text-main);">
                                ⚡ Olandijos TTF Gamtinės Dujos
                            </strong>
                            <span class="text-xs font-mono font-bold" id="baro-chart-hover-val" style="color: #16A34A;"></span>
                        </div>
                        <span id="baro-chart-desc" class="hidden md:inline text-[11px]" style="color: var(--text-muted);">
                            Azoto gamybos savikaina Europoje
                        </span>
                    </div>

                    <!-- CANVAS GRAFIKAS -->
                    <div class="relative w-full h-64 sm:h-72 select-none cursor-crosshair">
                        <canvas id="baro-canvas" class="w-full h-full block"></canvas>
                    </div>
                </div>

                <!-- 3. 5 RINKOS PILIASTRŲ KORTELĖS -->
                <div class="space-y-3">
                    <div class="flex justify-between items-center px-1">
                        <h4 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider" style="color: var(--text-main);">
                            5 Rinkos Piliastrai (Išankstiniai signalai):
                        </h4>
                        <span class="text-xs text-slate-400">Atnaujinama kasdien 12:00 ir 18:00</span>
                    </div>

                    <div id="baro-signals-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
                        <div class="col-span-full py-8 text-center text-slate-500 text-xs">Kraunamos taisyklės...</div>
                    </div>
                </div>

            </div>

        </div>
    `;

    setupCommodityButtons();
    setupRangeButtons();
    initCanvasChart();
    listenToBarometerData();
}

function setupCommodityButtons() {
    document.querySelectorAll('.btn-baro-comm').forEach(btn => {
        btn.onclick = () => {
            activeCommodity = btn.getAttribute('data-comm');
            hoveredPoint = null;
            updateCommodityButtonsUI();
            drawChart();
        };
    });
    updateCommodityButtonsUI();
}

function updateCommodityButtonsUI() {
    document.querySelectorAll('.btn-baro-comm').forEach(btn => {
        const c = btn.getAttribute('data-comm');
        if (c === activeCommodity) {
            btn.className = "btn-baro-comm px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
        } else {
            btn.className = "btn-baro-comm px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white";
        }
    });

    const cfg = COMMODITY_CONFIG[activeCommodity];
    const titleEl = document.getElementById('baro-chart-title');
    const descEl = document.getElementById('baro-chart-desc');
    if (titleEl) titleEl.innerHTML = `${cfg.icon} ${cfg.name}`;
    if (descEl) descEl.textContent = cfg.desc;
}

function setupRangeButtons() {
    document.querySelectorAll('.btn-baro-range').forEach(btn => {
        btn.onclick = () => {
            activeRange = btn.getAttribute('data-range');
            hoveredPoint = null;
            updateRangeButtonsUI();
            drawChart();
        };
    });
    updateRangeButtonsUI();
}

function updateRangeButtonsUI() {
    document.querySelectorAll('.btn-baro-range').forEach(btn => {
        const r = btn.getAttribute('data-range');
        if (r === activeRange) {
            btn.className = "btn-baro-range px-2.5 py-1 rounded-lg text-xs font-bold bg-tractorPrimary text-white shadow";
        } else {
            btn.className = "btn-baro-range px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white";
        }
    });
}

function createSpeedometerGaugeSvg(score) {
    const clampedScore = Math.max(-7, Math.min(7, score));
    const angle = (-clampedScore / 7) * 75;

    let scoreColor = "#22C55E";
    if (score >= 3) scoreColor = "#EF4444";
    else if (score >= -2 && score <= 2) scoreColor = "#F59E0B";

    return `
        <div class="flex flex-col items-center justify-center select-none shrink-0">
            <svg viewBox="0 0 170 100" class="w-36 sm:w-44 overflow-visible">
                <path d="M 22 88 A 62 62 0 0 1 65 30" fill="none" stroke="#EF4444" stroke-width="12" stroke-linecap="round"/>
                <path d="M 67 29 A 62 62 0 0 1 103 29" fill="none" stroke="#F59E0B" stroke-width="12"/>
                <path d="M 105 30 A 62 62 0 0 1 148 88" fill="none" stroke="#22C55E" stroke-width="12" stroke-linecap="round"/>

                <text x="14" y="96" fill="#EF4444" font-size="8" font-weight="900" text-anchor="middle">+7</text>
                <text x="85" y="19" fill="#F59E0B" font-size="8" font-weight="900" text-anchor="middle">0</text>
                <text x="156" y="96" fill="#22C55E" font-size="8" font-weight="900" text-anchor="middle">-7</text>

                <g transform="translate(85, 88) rotate(${angle})">
                    <polygon points="-3,-5 0,-62 3,-5" fill="var(--text-main)" />
                    <circle cx="0" cy="0" r="7" fill="var(--text-main)"/>
                    <circle cx="0" cy="0" r="3" fill="#181C18"/>
                </g>
            </svg>
            <div class="text-center -mt-1">
                <strong class="font-mono text-2xl font-black block" style="color: ${scoreColor};">
                    ${score > 0 ? '+' : ''}${score}
                </strong>
                <span class="text-[9px] uppercase font-bold tracking-wider block" style="color: var(--text-muted);">Rinkos balas</span>
            </div>
        </div>
    `;
}

function listenToBarometerData() {
    if (unsubscribeBarometer) unsubscribeBarometer();

    unsubscribeBarometer = db.collection("fertilizer_market").doc("barometer_data").onSnapshot(doc => {
        const card = document.getElementById('baro-verdict-card');
        const grid = document.getElementById('baro-signals-grid');
        const timeEl = document.getElementById('baro-sync-time');
        if (!card || !grid) return;

        if (!doc.exists) {
            card.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Laukiama rinkos duomenų...</div>`;
            return;
        }

        cachedBarometerData = doc.data();
        const data = cachedBarometerData;
        const baro = data.barometer || {};
        const signals = baro.signals || [];
        const score = baro.totalScore || 0;

        if (data.updatedAt && timeEl) {
            const date = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
            timeEl.innerHTML = `🕒 Atnaujinta: <strong>${date.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}</strong> (kas 6 val.)`;
        }

        let borderColor = "border-green-500 bg-green-950/20";
        if (score >= 3) borderColor = "border-red-500 bg-red-950/30";
        else if (score >= -2 && score <= 2) borderColor = "border-amber-500 bg-amber-950/20";

        const gaugeHtml = createSpeedometerGaugeSvg(score);

        card.className = `rounded-2xl p-6 md:p-8 border-2 ${borderColor} shadow-2xl space-y-4 transition-all`;
        card.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-tractorBorder/70 pb-4">
                <div class="space-y-1.5 flex-1">
                    <span class="text-[11px] uppercase font-black tracking-wider text-tractorPrimaryLight block">
                        5 Piliastrų Rinkos Verdiktas:
                    </span>
                    <h3 class="font-oswald text-2xl md:text-3xl font-black uppercase tracking-wide" style="color: var(--text-main);">
                        ${baro.statusText || '🟡 RINKA STABILI'}
                    </h3>
                    <p class="text-xs md:text-sm leading-relaxed" style="color: var(--text-main);">
                        ${baro.recommendation || 'Rinka veikia subalansuotai.'}
                    </p>
                </div>

                <div class="shrink-0 flex items-center justify-center pt-2 md:pt-0">
                    ${gaugeHtml}
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                    <span class="text-[10px] block" style="color: var(--text-muted);">Orientacinė salietra kieme</span>
                    <strong class="font-mono text-base font-bold text-green-500">~${data.indicators?.estimatedSalietra || 310} €/t</strong>
                </div>
                <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                    <span class="text-[10px] block" style="color: var(--text-muted);">TTF Gamtinės dujos</span>
                    <strong class="font-mono text-base font-bold" style="color: var(--text-main);">${data.gasTTF?.priceMWh || 34.5} €/MWh</strong>
                </div>
                <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                    <span class="text-[10px] block" style="color: var(--text-muted);">EUR / USD kursas</span>
                    <strong class="font-mono text-base font-bold" style="color: var(--text-main);">${data.currency?.rate || 1.085}</strong>
                </div>
                <div class="bg-tractorBg p-3 rounded-xl border border-tractorBorder">
                    <span class="text-[10px] block" style="color: var(--text-muted);">Kviečių/Salietros santykis</span>
                    <strong class="font-mono text-base font-bold text-amber-500">${data.indicators?.wheatToFertRatio || 1.45} : 1</strong>
                </div>
            </div>
        `;

        grid.innerHTML = signals.map(sig => {
            let sigColor = "text-green-500 border-green-500/40 bg-green-500/10";
            if (sig.score > 0) sigColor = "text-red-500 border-red-500/40 bg-red-500/10";
            else if (sig.score === 0) sigColor = "text-amber-500 border-amber-500/40 bg-amber-500/10";

            return `
                <div class="bg-tractorSurface border border-tractorBorder rounded-xl p-3.5 space-y-1.5 flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start gap-1">
                            <strong class="text-xs font-bold leading-tight" style="color: var(--text-main);">${sig.name}</strong>
                            <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${sigColor}">
                                ${sig.score > 0 ? '+' : ''}${sig.score}
                            </span>
                        </div>
                        <div class="font-mono text-sm font-black mt-1" style="color: var(--text-main);">${sig.value}</div>
                    </div>
                    <p class="text-[10px] leading-relaxed pt-1 border-t border-tractorBorder/50" style="color: var(--text-muted);">
                        ${sig.desc}
                    </p>
                </div>
            `;
        }).join('');

        drawChart();
    });
}

function initCanvasChart() {
    const canvas = document.getElementById('baro-canvas');
    if (!canvas) return;

    const onMove = (clientX) => {
        if (!cachedBarometerData || !cachedBarometerData.history) return;
        const historyList = cachedBarometerData.history[activeCommodity] || [];
        const filtered = filterHistoryByRange(historyList, activeRange);
        if (filtered.length < 2) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const idx = Math.min(Math.max(0, Math.round((x / rect.width) * (filtered.length - 1))), filtered.length - 1);
        hoveredPoint = filtered[idx];

        const hoverLabel = document.getElementById('baro-chart-hover-val');
        const cfg = COMMODITY_CONFIG[activeCommodity];
        if (hoverLabel && hoveredPoint) {
            hoverLabel.innerHTML = `• ${hoveredPoint.price} ${cfg.unit} (${hoveredPoint.date})`;
        }
        drawChart();
    };

    canvas.onmousemove = (e) => onMove(e.clientX);
    canvas.ontouchmove = (e) => { if (e.touches.length > 0) onMove(e.touches[0].clientX); };
    canvas.onmouseleave = () => {
        hoveredPoint = null;
        const hoverLabel = document.getElementById('baro-chart-hover-val');
        if (hoverLabel) hoverLabel.innerHTML = '';
        drawChart();
    };

    window.addEventListener('resize', drawChart);
}

function drawChart() {
    const canvas = document.getElementById('baro-canvas');
    if (!canvas || !cachedBarometerData || !cachedBarometerData.history) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const cfg = COMMODITY_CONFIG[activeCommodity];
    const historyList = cachedBarometerData.history[activeCommodity] || [];
    const data = filterHistoryByRange(historyList, activeRange);

    if (data.length < 2) return;

    const prices = data.map(d => d.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const paddingVal = (maxP - minP) * 0.1 || 1;
    const minPrice = minP - paddingVal;
    const maxPrice = maxP + paddingVal;

    const padTop = 20, padBottom = 30, padLeft = 45, padRight = 15;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const isLight = document.documentElement.classList.contains('light-theme');
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const textColor = isLight ? '#64748B' : '#94A3B8';

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';

    // Tinklelis ir Y ašis
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
        const p = minPrice + ((maxPrice - minPrice) * (i / steps));
        const y = padTop + chartH - ((p - minPrice) / (maxPrice - minPrice)) * chartH;

        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        ctx.fillText(`${p.toFixed(activeCommodity === 'currency' ? 4 : 1)}`, padLeft - 6, y + 3);
    }

    const points = data.map((d, idx) => {
        const x = padLeft + (idx / (data.length - 1)) * chartW;
        const y = padTop + chartH - ((d.price - minPrice) / (maxPrice - minPrice)) * chartH;
        return { x, y, ...d };
    });

    // Gradientinis plotas
    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    grad.addColorStop(0, "rgba(22, 163, 74, 0.30)");
    grad.addColorStop(1, "rgba(22, 163, 74, 0.0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.lineTo(points[points.length - 1].x, padTop + chartH);
    ctx.lineTo(points[0].x, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Kreivė
    ctx.strokeStyle = cfg.color || "#16A34A";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    // X ašies datos
    ctx.textAlign = 'center';
    const dateSteps = Math.min(5, data.length);
    for (let i = 0; i < dateSteps; i++) {
        const idx = Math.floor((i / (dateSteps - 1)) * (data.length - 1));
        ctx.fillText(data[idx].shortDate, points[idx].x, height - 8);
    }

    // Užvedimo linija
    if (hoveredPoint) {
        const pt = points.find(p => p.date === hoveredPoint.date) || points[points.length - 1];
        ctx.strokeStyle = isLight ? '#0F172A' : '#FFFFFF';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pt.x, padTop);
        ctx.lineTo(pt.x, padTop + chartH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = cfg.color || "#16A34A";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function filterHistoryByRange(history, range) {
    if (!history || history.length === 0) return [];
    const now = new Date();
    let days = 180;
    switch (range) {
        case '1W': days = 7; break;
        case '1M': days = 30; break;
        case '3M': days = 90; break;
        case '6M': days = 180; break;
        case '1Y': days = 365; break;
    }
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const filtered = history.filter(item => item.date >= cutoffStr);
    return filtered.length >= 2 ? filtered : history.slice(-5);
}