// js/matif.js
import { db } from './firebase.js';

let matifMarketData = null;
let activeCropId = 'rapeseed';
let activeRange = '6M';
let hoveredPoint = null;
let unsubscribeMatif = null;

export function renderMatifSection(container) {
    if (!container) return;

    container.innerHTML = `
        <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-5 md:p-7 shadow-xl space-y-5">
            
            <!-- ANTRAŠTĖ -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tractorBorder/70 pb-4">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                        <span class="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                        <span>Gyva rinka • Euronext MATIF birža</span>
                    </div>
                    <h3 class="font-oswald text-xl md:text-2xl font-bold tracking-wide" style="color: var(--text-main);">
                        📈 MATIF Grūdų ir Žaliavų Biržos Kainos
                    </h3>
                </div>

                <div class="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-500 dark:text-slate-400">
                    <span id="matif-sync-time">Kraunama iš biržos...</span>
                </div>
            </div>

            <!-- 3 BIRŽOS KORTELĖS (IDEALIAI SUBALANSUOTOS) -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" id="matif-cards-grid">
                <div class="text-center py-6 text-slate-500 text-xs col-span-full">Kraunami biržos duomenys...</div>
            </div>

            <!-- GRAFIKO BLOKAS -->
            <div class="space-y-3 bg-tractorBg/90 border border-tractorBorder p-4 md:p-5 rounded-2xl">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/60 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold" id="matif-chart-title" style="color: var(--text-main);">
                            🌱 Rapsai (Euronext MATIF)
                        </span>
                        <span class="text-xs text-slate-400 font-mono" id="matif-chart-hover-val"></span>
                    </div>

                    <!-- PERIODŲ MYGTUKAI -->
                    <div class="flex items-center gap-1 bg-tractorSurface p-1 rounded-xl border border-tractorBorder">
                        <button type="button" class="btn-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="1W">1 sav.</button>
                        <button type="button" class="btn-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="1M">1 mėn.</button>
                        <button type="button" class="btn-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="3M">3 mėn.</button>
                        <button type="button" class="btn-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="6M">6 mėn.</button>
                        <button type="button" class="btn-range px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer" data-range="1Y">1 metai</button>
                    </div>
                </div>

                <!-- CANVAS GRAFIKAS -->
                <div class="relative w-full h-64 select-none cursor-crosshair">
                    <canvas id="matif-canvas" class="w-full h-full block"></canvas>
                </div>
            </div>

            <!-- ATEITIES SANDORIAI -->
            <div class="bg-tractorBg p-4 rounded-xl border border-tractorBorder space-y-2">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block" id="matif-contracts-label">
                    🌱 Rapsų būsimo derliaus fiksuoti sandoriai:
                </span>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs" id="matif-contracts-grid"></div>
            </div>

            <!-- INFORMACIJA -->
            <div class="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 pt-1 border-t border-tractorBorder/40">
                <span>ℹ️</span> 
                <span>Rapsų, kviečių ir kukurūzų duomenys tiesiogiai iš <strong>Euronext Paris (MATIF)</strong> biržos srauto. 100% tikros dienos uždarymo kainos ir gyvi biržos sandoriai.</span>
            </div>

        </div>
    `;

    updateRangeButtons();
    initCanvasChart();

    container.querySelectorAll('.btn-range').forEach(btn => {
        btn.onclick = () => {
            activeRange = btn.getAttribute('data-range');
            updateRangeButtons();
            drawChart();
        };
    });

    listenToMatifFirebase();
}

function listenToMatifFirebase() {
    if (unsubscribeMatif) unsubscribeMatif();

    unsubscribeMatif = db.collection("matif_prices").doc("market_data").onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            matifMarketData = data.crops || {};

            if (data.updatedAt) {
                const date = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date();
                const timeStr = date.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' });
                const timeEl = document.getElementById('matif-sync-time');
                if (timeEl) timeEl.innerHTML = `🕒 Atnaujinta: <strong>${timeStr}</strong> (kas 6 val.)`;
            }

            renderCropCards();
            renderContracts();
            drawChart();
        }
    });
}

function renderCropCards() {
    const grid = document.getElementById('matif-cards-grid');
    if (!grid || !matifMarketData) return;

    // RODO TIK 3 TIKRAS OFICIALIAS EURONEXT BIRŽOS KULTŪRAS:
    const allowedCrops = ['rapeseed', 'wheat', 'corn'];
    const cropsList = allowedCrops.map(id => matifMarketData[id]).filter(Boolean);

    grid.innerHTML = cropsList.map(crop => {
        const isSelected = crop.id === activeCropId;
        const changeClass = crop.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500';

        return `
            <div class="matif-card p-4 rounded-xl border-2 transition cursor-pointer ${
                isSelected 
                ? 'bg-tractorPrimary/15 border-tractorPrimary ring-1 ring-tractorPrimary shadow-md' 
                : 'bg-tractorBg border-tractorBorder hover:border-slate-400'
            }" data-crop="${crop.id}">
                <div class="flex justify-between items-start">
                    <span class="text-sm font-bold uppercase truncate" style="color: var(--text-main);">${crop.icon} ${crop.name.split(' ')[0]}</span>
                    <span class="text-[10px] text-slate-400 font-mono">MATIF</span>
                </div>
                <div class="text-2xl sm:text-3xl font-black font-mono mt-2" style="color: var(--text-main);">${crop.currentPrice.toFixed(2)} €</div>
                <div class="flex justify-between items-center text-xs mt-1.5 font-bold ${changeClass}">
                    <span>${crop.change}</span>
                    <span class="text-[10px] text-slate-400 font-normal">Gyva</span>
                </div>
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.matif-card').forEach(card => {
        card.onclick = () => {
            activeCropId = card.getAttribute('data-crop');
            hoveredPoint = null;
            renderCropCards();
            renderContracts();
            drawChart();
        };
    });
}

function renderContracts() {
    if (!matifMarketData || !matifMarketData[activeCropId]) return;
    const crop = matifMarketData[activeCropId];
    const lbl = document.getElementById('matif-contracts-label');
    const grid = document.getElementById('matif-contracts-grid');
    const chartTitle = document.getElementById('matif-chart-title');

    if (lbl) lbl.textContent = `${crop.icon} ${crop.name} būsimo derliaus fiksuoti sandoriai:`;
    if (chartTitle) chartTitle.innerHTML = `${crop.icon} ${crop.name} <span class="text-xs font-normal text-slate-400">(${crop.ticker})</span>`;

    if (grid && crop.contracts) {
        grid.innerHTML = crop.contracts.map(c => `
            <div class="p-2.5 bg-tractorSurface rounded-lg border border-tractorBorder space-y-0.5">
                <span class="text-slate-400 block text-[10px] uppercase font-semibold truncate">${c.month}</span>
                <strong class="text-sm font-mono font-bold block" style="color: var(--text-main);">${c.price}</strong>
            </div>
        `).join('');
    }
}

function updateRangeButtons() {
    document.querySelectorAll('.btn-range').forEach(btn => {
        const r = btn.getAttribute('data-range');
        if (r === activeRange) {
            btn.className = "btn-range px-2.5 py-1 rounded-lg text-xs font-bold bg-tractorPrimary text-white shadow";
        } else {
            btn.className = "btn-range px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white";
        }
    });
}

function initCanvasChart() {
    const canvas = document.getElementById('matif-canvas');
    if (!canvas) return;

    const onMove = (clientX) => {
        if (!matifMarketData || !matifMarketData[activeCropId]) return;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const crop = matifMarketData[activeCropId];
        const data = filterDataByRange(crop.history || [], activeRange);

        if (data.length < 2) return;

        const idx = Math.min(Math.max(0, Math.round((x / rect.width) * (data.length - 1))), data.length - 1);
        hoveredPoint = data[idx];

        const hoverLabel = document.getElementById('matif-chart-hover-val');
        if (hoverLabel && hoveredPoint) {
            hoverLabel.innerHTML = `• <strong class="text-green-500 font-bold">${hoveredPoint.price.toFixed(2)} €/t</strong> (${hoveredPoint.date})`;
        }

        drawChart();
    };

    canvas.onmousemove = (e) => onMove(e.clientX);
    canvas.ontouchmove = (e) => {
        if (e.touches.length > 0) onMove(e.touches[0].clientX);
    };

    canvas.onmouseleave = () => {
        hoveredPoint = null;
        const hoverLabel = document.getElementById('matif-chart-hover-val');
        if (hoverLabel) hoverLabel.innerHTML = '';
        drawChart();
    };

    window.addEventListener('resize', drawChart);
}

function drawChart() {
    const canvas = document.getElementById('matif-canvas');
    if (!canvas || !matifMarketData || !matifMarketData[activeCropId]) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const crop = matifMarketData[activeCropId];
    const data = filterDataByRange(crop.history || [], activeRange);

    if (data.length < 2) return;

    const prices = data.map(d => d.price);
    const minPrice = Math.floor(Math.min(...prices) - 5);
    const maxPrice = Math.ceil(Math.max(...prices) + 5);

    const padTop = 20;
    const padBottom = 30;
    const padLeft = 45;
    const padRight = 15;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const isLight = document.documentElement.classList.contains('light-theme');
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const textColor = isLight ? '#64748B' : '#94A3B8';

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';

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

        ctx.fillText(`${p.toFixed(0)} €`, padLeft - 6, y + 3);
    }

    const points = data.map((d, idx) => {
        const x = padLeft + (idx / (data.length - 1)) * chartW;
        const y = padTop + chartH - ((d.price - minPrice) / (maxPrice - minPrice)) * chartH;
        return { x, y, ...d };
    });

    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    grad.addColorStop(0, "rgba(22, 163, 74, 0.35)");
    grad.addColorStop(1, "rgba(22, 163, 74, 0.0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, padTop + chartH);
    ctx.lineTo(points[0].x, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = crop.color || "#16A34A";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.textAlign = 'center';
    const dateSteps = Math.min(5, data.length);
    for (let i = 0; i < dateSteps; i++) {
        const idx = Math.floor((i / (dateSteps - 1)) * (data.length - 1));
        const pt = points[idx];
        ctx.fillText(data[idx].shortDate, pt.x, height - 8);
    }

    if (hoveredPoint) {
        const hoveredPt = points.find(p => p.date === hoveredPoint.date) || points[points.length - 1];

        ctx.strokeStyle = isLight ? '#0F172A' : '#FFFFFF';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hoveredPt.x, padTop);
        ctx.lineTo(hoveredPt.x, padTop + chartH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = crop.color || "#16A34A";
        ctx.beginPath();
        ctx.arc(hoveredPt.x, hoveredPt.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function filterDataByRange(history, range) {
    if (!history || history.length === 0) return [];

    const now = new Date();
    let daysToSubtract = 180;

    switch (range) {
        case '1W': daysToSubtract = 7; break;
        case '1M': daysToSubtract = 30; break;
        case '3M': daysToSubtract = 90; break;
        case '6M': daysToSubtract = 180; break;
        case '1Y': daysToSubtract = 365; break;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - daysToSubtract);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const filtered = history.filter(item => item.date >= cutoffStr);
    return filtered.length >= 2 ? filtered : history.slice(-5);
}