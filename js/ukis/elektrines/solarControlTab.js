// js/ukis/elektrines/solarControlTab.js
import { showBottomToast } from '../../core/ui.js';
import { getSolarBrandMeta } from './solarBrandsConfig.js';

let cachedSolarWeather = null;
let cachedChartData = null;
let activeSolarChartTab = 'year'; // 'today' | 'month' | 'year'
let hoveredSolarItem = null;
let resizeBound = false;

export function renderSolarControlTabHtml(dev, liveTelemetry) {
    const cfg = dev.config || {};
    const brandMeta = getSolarBrandMeta(dev.brand);
    const inverterKw = Number(cfg.inverterKw ?? 12.0);
    const panelsKwp = Number(cfg.panelsKwp ?? 7.44);
    const curPowerW = Number(liveTelemetry.currentPowerW ?? 0);
    const curPowerKw = (curPowerW / 1000).toFixed(2);
    const todayKwh = Number(liveTelemetry.todayKwh ?? 0).toFixed(2);
    const monthKwh = Number(liveTelemetry.monthKwh ?? 0).toFixed(1);
    const yearKwh = Number(liveTelemetry.yearKwh ?? 0).toFixed(1);
    const totalKwh = Number(liveTelemetry.totalKwh ?? 0).toFixed(1);
    const isGenerating = curPowerW > 20;

    return `
        <!-- 1. GYVA SAULĖS ELEKTRINĖS TELEMETRIJA (4 KPI KORTELĖS) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            <div class="bg-tractorBg border-2 ${isGenerating ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-tractorBorder'} rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">☀️ Gamyba dabar</span>
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${isGenerating ? 'bg-green-500/20 text-green-500' : 'bg-tractorSurface text-slate-400'}">
                        ${isGenerating ? '🟢 Gamina' : '🌙 Ramybė'}
                    </span>
                </div>
                <div>
                    <strong class="font-mono text-xl sm:text-2xl font-black text-amber-500 block">${curPowerKw} kW</strong>
                    <span class="text-[11px] font-mono text-slate-400">(${curPowerW} W • ${panelsKwp} kWp)</span>
                </div>
            </div>

            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">📅 Šiandien</span>
                    <span class="text-sm">⚡</span>
                </div>
                <div>
                    <strong id="solar-kpi-today-kwh" class="font-mono text-xl sm:text-2xl font-black text-green-500 block">${todayKwh} kWh</strong>
                    <span id="solar-today-saved-eur" class="text-[11px] font-bold text-green-600 dark:text-green-400">Skaičiuojama vertė...</span>
                </div>
            </div>

            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">📊 Šį mėnesį</span>
                    <span class="text-sm">🗓️</span>
                </div>
                <div>
                    <strong id="solar-kpi-month-kwh" class="font-mono text-xl sm:text-2xl font-black text-sky-400 block">${monthKwh} kWh</strong>
                    <span id="solar-kpi-year-kwh" class="text-[11px] font-mono text-slate-400">Šiemet: ${(yearKwh / 1000).toFixed(2)} MWh (${yearKwh} kWh)</span>
                </div>
            </div>

            <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">🏆 Viso</span>
                    <span class="text-[10px] font-mono bg-tractorSurface px-1.5 py-0.5 rounded border border-tractorBorder" style="color: var(--text-main);">${inverterKw} kW</span>
                </div>
                <div>
                    <strong class="font-mono text-xl sm:text-2xl font-black block" style="color: var(--text-main);">${(totalKwh / 1000).toFixed(2)} MWh</strong>
                    <span class="text-[11px] font-mono text-slate-400">(${totalKwh} kWh viso)</span>
                </div>
            </div>

        </div>

        <!-- 🌟 1B. CANVAS GRAFIKAI (ŠIANDIEN / PASK. 7 D. / ŠIE METAI) -->
        <div class="bg-tractorBg/90 border border-tractorBorder rounded-2xl p-3.5 sm:p-5 space-y-3 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2.5">
                <div class="flex items-center flex-wrap gap-2">
                    <span class="text-xs sm:text-sm font-bold" id="solar-chart-title" style="color: var(--text-main);">
                        📈 Saulės Gamybos Dinamika
                    </span>
                    <span class="text-xs text-slate-400 font-mono" id="solar-chart-hover-val"></span>
                </div>

                <div class="flex items-center gap-1 bg-tractorSurface p-1 rounded-xl border border-tractorBorder self-start sm:self-auto">
                    <button type="button" data-chart-tab="today" class="solar-chart-tab-btn px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer text-slate-400 hover:text-white">
                        📈 Šiandien
                    </button>
                    <button type="button" data-chart-tab="month" class="solar-chart-tab-btn px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer text-slate-400 hover:text-white">
                        📊 7 dienos
                    </button>
                    <button type="button" data-chart-tab="year" class="solar-chart-tab-btn px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-tractorPrimary text-white shadow">
                        📆 Šie metai
                    </button>
                </div>
            </div>

            <div class="relative w-full select-none cursor-crosshair" style="height: 230px;">
                <canvas id="solar-history-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>
        </div>

        <!-- 2. SAULĖS ELEKTRINĖS PARAMETRAI -->
        <div class="bg-tractorBg border border-tractorBorder p-4 rounded-2xl space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tractorBorder/60 pb-2.5">
                <div>
                    <h3 class="font-oswald text-base sm:text-lg font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>⚙️</span> Elektrinės Parametrai ir Ūkio Agregatų Maitinimas
                    </h3>
                    <p class="text-xs text-slate-400">
                        Pagal jūsų saulės modulių galią (${panelsKwp} kWp) ir Open-Meteo saulės radiaciją prognozuojame 48 val. gamybą.
                    </p>
                </div>
                <button type="button" id="btn-save-solar-config" class="h-9 px-4 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow shrink-0">
                    💾 Išsaugoti parametrus
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <label class="text-[10px] font-bold text-amber-500 uppercase block">☀️ Saulės modulių galia (kWp)</label>
                    <input id="inp-solar-panels-kwp" type="number" step="0.01" value="${panelsKwp}"
                        class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-3 font-mono font-bold text-sm outline-none" style="color: var(--text-main);">
                </div>

                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase block">🔌 ${brandMeta.name} Inverterio galia (kW)</label>
                    <input id="inp-solar-inverter-kw" type="number" step="0.5" value="${inverterKw}"
                        class="w-full h-9 bg-tractorBg border border-tractorBorder rounded-lg px-3 font-mono font-bold text-sm outline-none" style="color: var(--text-main);">
                </div>

                <div class="bg-tractorSurface p-3 rounded-xl border border-tractorBorder space-y-1">
                    <div class="flex justify-between items-center">
                        <label class="text-[10px] font-bold text-green-500 uppercase">⚡ Pertekliaus riba agregatams</label>
                        <strong id="lbl-solar-threshold" class="font-mono font-bold text-green-500">&ge; ${cfg.surplusThresholdKw ?? 1.5} kW</strong>
                    </div>
                    <input id="inp-solar-threshold" type="range" min="0.5" max="12.0" step="0.5" value="${cfg.surplusThresholdKw ?? 1.5}" class="w-full accent-tractorPrimary cursor-pointer mt-2">
                </div>
            </div>
        </div>

        <!-- 3. 48 VALANDŲ SAULĖS GAMYBOS PROGNOZĖ + NORD POOL LENTELĖ -->
        <div class="space-y-2 pt-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-oswald text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-1.5" style="color: var(--text-main);">
                    <span>📅</span> 48 val. Saulės Gamybos Prognozė (Pagal ${panelsKwp} kWp) ir Nord Pool Kaina
                </h3>
                <span id="solar-forecast-summary" class="text-xs font-mono font-bold text-amber-500">Skaičiuojama saulės radiacija...</span>
            </div>
            <div id="solar-schedule-tables-box" class="grid grid-cols-1 lg:grid-cols-2 gap-3.5"></div>
        </div>
    `;
}

export async function bindSolarControlEvents(currentUser, dev, onConfigSaved, cachedElecHours) {
    cachedChartData = null;
    hoveredSolarItem = null;

    const inpPanels = document.getElementById('inp-solar-panels-kwp');
    const inpInv = document.getElementById('inp-solar-inverter-kw');
    const inpThresh = document.getElementById('inp-solar-threshold');
    const lblThresh = document.getElementById('lbl-solar-threshold');

    inpThresh?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (lblThresh) lblThresh.textContent = `≥ ${val.toFixed(1)} kW`;
        dev.config.surplusThresholdKw = val;
        renderSolarScheduleGrid(dev, cachedElecHours);
    });

    [inpPanels, inpInv].forEach(el => {
        el?.addEventListener('input', () => {
            dev.config.panelsKwp = parseFloat(inpPanels?.value) || 7.44;
            dev.config.inverterKw = parseFloat(inpInv?.value) || 12.0;
            renderSolarScheduleGrid(dev, cachedElecHours);
        });
    });

    document.getElementById('btn-save-solar-config')?.addEventListener('click', async () => {
        dev.config.panelsKwp = parseFloat(inpPanels?.value) || 7.44;
        dev.config.inverterKw = parseFloat(inpInv?.value) || 12.0;
        dev.config.surplusThresholdKw = parseFloat(inpThresh?.value) || 1.5;
        await onConfigSaved(true, dev.config);
        showBottomToast("Saulės elektrinės parametrai išsaugoti! ☀️💾");
    });

    const updateTabButtons = () => {
        document.querySelectorAll('.solar-chart-tab-btn').forEach(b => {
            if (b.getAttribute('data-chart-tab') === activeSolarChartTab) {
                b.className = "solar-chart-tab-btn px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-tractorPrimary text-white shadow";
            } else {
                b.className = "solar-chart-tab-btn px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer text-slate-400 hover:text-white";
            }
        });
    };
    updateTabButtons();

    document.querySelectorAll('.solar-chart-tab-btn').forEach(btn => {
        btn.onclick = () => {
            activeSolarChartTab = btn.getAttribute('data-chart-tab');
            hoveredSolarItem = null;
            const hoverLabel = document.getElementById('solar-chart-hover-val');
            if (hoverLabel) hoverLabel.innerHTML = '';
            updateTabButtons();
            drawSolarCanvasChart();
        };
    });

    initSolarCanvasInteractions();
    drawSolarCanvasChart();

    if (currentUser && dev.id) {
        try {
            const cRes = await fetch(
                `https://us-central1-neighborpm-b9968.cloudfunctions.net/getSolarCharts?userId=${encodeURIComponent(currentUser.uid)}&deviceDocId=${encodeURIComponent(dev.id)}`
            );
            const cData = await cRes.json();
            if (cData && cData.success) {
                cachedChartData = cData;

                const elMonth = document.getElementById('solar-kpi-month-kwh');
                const elYear = document.getElementById('solar-kpi-year-kwh');
                const elToday = document.getElementById('solar-kpi-today-kwh');

                if (elMonth && cData.monthTotalKwh !== undefined) elMonth.textContent = `${cData.monthTotalKwh} kWh`;
                if (elYear && cData.yearTotalKwh !== undefined) {
                    elYear.textContent = `Šiemet: ${(cData.yearTotalKwh / 1000).toFixed(2)} MWh (${cData.yearTotalKwh} kWh)`;
                }
                if (elToday && cData.todayKwhFromChart !== null && cData.todayKwhFromChart !== undefined) {
                    elToday.textContent = `${Number(cData.todayKwhFromChart).toFixed(2)} kWh`;
                }
                drawSolarCanvasChart();
            }
        } catch (err) {
            console.warn("Saulės grafiko klaida:", err.message);
        }
    }

    const lat = dev.config?.lat || 55.2885;
    const lng = dev.config?.lng || 23.9745;
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=shortwave_radiation,cloud_cover&timezone=Europe%2FVilnius&forecast_days=2`);
        const data = await res.json();
        cachedSolarWeather = data.hourly || null;
    } catch (e) {}

    renderSolarScheduleGrid(dev, cachedElecHours);
}

function getActiveChartDataset() {
    if (!cachedChartData) return { items: [], unit: 'kWh', color: '#16A34A', gradStart: 'rgba(22, 163, 74, 0.32)', title: '📈 Kraunami elektrinės grafikai...' };

    if (activeSolarChartTab === 'today') {
        const pts = (cachedChartData.todayPowers || []).map(p => ({
            label: p.time,
            fullDate: `${cachedChartData.todayStr} ${p.time}`,
            val: parseFloat((p.powerW / 1000).toFixed(2))
        }));
        return {
            items: pts,
            unit: 'kW',
            color: '#F59E0B',
            gradStart: 'rgba(245, 158, 11, 0.35)',
            title: `☀️ Šiandienos (${cachedChartData.todayStr}) galios kreivė`
        };
    }

    if (activeSolarChartTab === 'month') {
        const pts = (cachedChartData.monthDays || []).map(d => ({
            label: d.label,
            fullDate: d.date,
            val: d.kwh
        }));
        return {
            items: pts,
            unit: 'kWh',
            color: '#0EA5E9',
            gradStart: 'rgba(14, 165, 233, 0.35)',
            title: `📊 Paskutinių 7 dienų gamyba (Šį mėnesį: ${cachedChartData.monthTotalKwh} kWh)`
        };
    }

    const pts = (cachedChartData.yearMonths || []).map(m => ({
        label: m.label,
        fullDate: m.date,
        val: m.kwh
    }));
    return {
        items: pts,
        unit: 'kWh',
        color: '#16A34A',
        gradStart: 'rgba(22, 163, 74, 0.35)',
        title: `📆 Šių metų mėnesinė gamyba (Viso: ${(cachedChartData.yearTotalKwh / 1000).toFixed(2)} MWh)`
    };
}

function initSolarCanvasInteractions() {
    const canvas = document.getElementById('solar-history-canvas');
    if (!canvas) return;

    const onMove = (clientX) => {
        const ds = getActiveChartDataset();
        if (!ds.items || ds.items.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const padLeft = 48;
        const padRight = 16;
        const chartW = rect.width - padLeft - padRight;
        const rel = Math.min(1, Math.max(0, (x - padLeft) / Math.max(1, chartW)));

        const idx = Math.min(ds.items.length - 1, Math.max(0, Math.round(rel * (ds.items.length - 1))));
        hoveredSolarItem = ds.items[idx];

        const hoverLabel = document.getElementById('solar-chart-hover-val');
        if (hoverLabel && hoveredSolarItem) {
            hoverLabel.innerHTML = `• <strong class="text-amber-500 font-bold">${hoveredSolarItem.val} ${ds.unit}</strong> (${hoveredSolarItem.fullDate})`;
        }
        drawSolarCanvasChart();
    };

    canvas.onmousemove = (e) => onMove(e.clientX);
    canvas.ontouchmove = (e) => { if (e.touches.length > 0) onMove(e.touches[0].clientX); };
    canvas.onmouseleave = () => {
        hoveredSolarItem = null;
        const hoverLabel = document.getElementById('solar-chart-hover-val');
        if (hoverLabel) hoverLabel.innerHTML = '';
        drawSolarCanvasChart();
    };

    if (!resizeBound) {
        window.addEventListener('resize', drawSolarCanvasChart);
        resizeBound = true;
    }
}

function drawSolarCanvasChart() {
    const canvas = document.getElementById('solar-history-canvas');
    const titleEl = document.getElementById('solar-chart-title');
    if (!canvas) return;

    const ds = getActiveChartDataset();
    if (titleEl) titleEl.textContent = ds.title;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const isLight = document.documentElement.classList.contains('light-theme');
    const gridColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
    const textColor = isLight ? '#64748B' : '#94A3B8';

    if (!ds.items || ds.items.length === 0) {
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(cachedChartData ? 'Šiam periodui duomenų dar nėra.' : 'Kraunami duomenys...', width / 2, height / 2);
        return;
    }

    const vals = ds.items.map(d => d.val);
    const maxVal = Math.max(ds.unit === 'kW' ? 1 : 5, Math.ceil(Math.max(...vals) * 1.12));
    const minVal = 0;

    const padTop = 16;
    const padBottom = 26;
    const padLeft = 48;
    const padRight = 16;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
        const v = minVal + ((maxVal - minVal) * (i / steps));
        const y = padTop + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        ctx.fillText(`${ds.unit === 'kW' ? v.toFixed(1) : v.toFixed(0)} ${ds.unit}`, padLeft - 6, y + 3);
    }

    const points = ds.items.map((d, idx) => {
        const x = ds.items.length === 1
            ? padLeft + chartW / 2
            : padLeft + (idx / (ds.items.length - 1)) * chartW;
        const y = padTop + chartH - ((d.val - minVal) / (maxVal - minVal)) * chartH;
        return { x, y, ...d };
    });

    if (points.length >= 2) {
        const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
        grad.addColorStop(0, ds.gradStart);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

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

        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2.8;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
    }

    if (points.length <= 35) {
        points.forEach(pt => {
            ctx.fillStyle = ds.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    const labelStep = points.length <= 12 ? 1 : Math.max(1, Math.floor(points.length / 7));
    points.forEach((pt, idx) => {
        if (idx % labelStep === 0 || idx === points.length - 1) {
            ctx.fillText(pt.label, pt.x, height - 6);
        }
    });

    if (hoveredSolarItem) {
        const hoveredPt = points.find(p => p.fullDate === hoveredSolarItem.fullDate) || points[points.length - 1];
        if (hoveredPt) {
            ctx.strokeStyle = isLight ? '#0F172A' : '#FFFFFF';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(hoveredPt.x, padTop);
            ctx.lineTo(hoveredPt.x, padTop + chartH);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = ds.color;
            ctx.beginPath();
            ctx.arc(hoveredPt.x, hoveredPt.y, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

export function renderSolarScheduleGrid(dev, cachedElecHours) {
    const tablesBox = document.getElementById('solar-schedule-tables-box');
    if (!tablesBox || !dev || cachedElecHours.length === 0) return;

    const cfg = dev.config || {};
    const panelsKwp = Number(cfg.panelsKwp ?? 7.44);
    const inverterKw = Number(cfg.inverterKw ?? 12.0);
    const thresholdKw = Number(cfg.surplusThresholdKw ?? 1.5);

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

    const todayHours = cachedElecHours.filter(h => h.date === todayStr);
    const avgTodayCt = todayHours.length > 0
        ? todayHours.reduce((a, b) => a + b.priceCtNoVat, 0) / todayHours.length
        : 12.0;
    const savedEurToday = ((Number(dev.telemetry?.todayKwh || 0) * avgTodayCt) / 100).toFixed(2);
    const savedEl = document.getElementById('solar-today-saved-eur');
    if (savedEl) {
        savedEl.textContent = `Vertė pagal Nord Pool: ~${savedEurToday} €`;
    }

    const getHourSolarKw = (dateStr, hourInt) => {
        if (!cachedSolarWeather || !cachedSolarWeather.time) return { kw: 0, rad: 0, clouds: 50 };
        const targetPrefix = `${dateStr}T${String(hourInt).padStart(2, '0')}`;
        const idx = cachedSolarWeather.time.findIndex(t => t.startsWith(targetPrefix));
        if (idx !== -1) {
            const rad = cachedSolarWeather.shortwave_radiation?.[idx] ?? 0;
            const clouds = cachedSolarWeather.cloud_cover?.[idx] ?? 0;
            const rawKw = panelsKwp * (rad / 1000) * 0.85;
            const cappedKw = Math.min(inverterKw, Math.max(0, rawKw));
            return { kw: parseFloat(cappedKw.toFixed(2)), rad: Math.round(rad), clouds };
        }
        return { kw: 0, rad: 0, clouds: 50 };
    };

    let todayProjectedKwh = 0;
    todayHours.forEach(h => { todayProjectedKwh += getHourSolarKw(todayStr, h.hour).kw; });
    const sumEl = document.getElementById('solar-forecast-summary');
    if (sumEl) {
        sumEl.textContent = `☀️ Prognozuojama šiandienos gamyba: ~${todayProjectedKwh.toFixed(1)} kWh`;
    }

    const buildDayTableHtml = (dateStr, titlePrefix) => {
        if (!dateStr) {
            return `
                <div class="bg-tractorBg border border-tractorBorder rounded-2xl p-8 text-center text-xs text-slate-400 my-auto">
                    ⏳ Rytojaus Nord Pool kainos pateikiamos po 14:00 val.
                </div>
            `;
        }

        const dayHours = cachedElecHours.filter(h => h.date === dateStr);

        const rowsHtml = dayHours.map(h => {
            const isCurrent = (dateStr === todayStr && h.hour === currentHourInt);
            const pCt = h.priceCtNoVat;
            const sol = getHourSolarKw(dateStr, h.hour);
            const isSurplus = sol.kw >= thresholdKw;

            let badgeHtml = "";
            if (isSurplus) {
                badgeHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-extrabold text-[11px]">
                        <span>☀️</span> <span>GAMINA (+${sol.kw.toFixed(1)} kW) -> Jungti agregatus!</span>
                    </span>
                `;
            } else if (sol.kw > 0.1) {
                badgeHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 font-semibold text-[11px]">
                        <span>🌤️</span> <span>Silpna saulė (+${sol.kw.toFixed(1)} kW)</span>
                    </span>
                `;
            } else {
                badgeHtml = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tractorSurface text-slate-400 border border-tractorBorder font-normal text-[11px]">
                        <span>🌙</span> <span>0 kW</span>
                    </span>
                `;
            }

            return `
                <tr class="border-b border-tractorBorder/50 ${isCurrent ? 'bg-tractorPrimary/20 border-l-4 border-l-tractorPrimary font-bold' : ''}">
                    <td class="py-1.5 px-3 font-mono text-xs font-bold" style="color: var(--text-main);">
                        ${h.hourLabel} ${isCurrent ? '<span class="px-1.5 py-0.5 rounded bg-tractorPrimary text-white text-[9px] uppercase">Dabar</span>' : ''}
                    </td>
                    <td class="py-1.5 px-2 font-mono text-xs font-bold" style="color: var(--text-main);">
                        ${pCt.toFixed(1)} ct
                    </td>
                    <td class="py-1.5 px-2 font-mono text-xs font-black ${sol.kw >= thresholdKw ? 'text-amber-500' : 'text-slate-400'}">
                        ${sol.kw.toFixed(2)} kW <span class="text-[10px] font-normal">(${sol.rad} W/m²)</span>
                    </td>
                    <td class="py-1.5 px-3 text-right">
                        ${badgeHtml}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="bg-tractorBg border border-tractorBorder rounded-2xl overflow-hidden shadow-sm">
                <div class="bg-tractorSurface px-3.5 py-2 border-b border-tractorBorder flex justify-between items-center">
                    <strong class="font-oswald text-sm sm:text-base uppercase tracking-wider" style="color: var(--text-main);">
                        ${titlePrefix}
                    </strong>
                    <span class="font-mono text-xs font-bold" style="color: var(--text-main);">📅 ${dateStr}</span>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-tractorBorder bg-tractorSurface/50 text-[10px] uppercase font-bold text-slate-400">
                            <th class="py-1.5 px-3">Valanda</th>
                            <th class="py-1.5 px-2">Nord Pool</th>
                            <th class="py-1.5 px-2">Prognozė (${panelsKwp} kWp)</th>
                            <th class="py-1.5 px-3 text-right">Saulės energija</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
    };

    tablesBox.innerHTML = `
        ${buildDayTableHtml(todayStr, '📅 ŠIANDIEN')}
        ${buildDayTableHtml(tomorrowStr, '⏭️ RYTOJ')}
    `;
}