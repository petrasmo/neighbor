// js/traktoriai/tractorsTab.js
import { db } from '../core/firebase.js';
import { showBottomToast, showDialog } from '../core/ui.js';
import {
    renderTractorFleetCardsSection,
    bindFleetCardsEvents,
    stopLiveTractorSimulation,
    setLiveTractorVraRate
} from './tractorLiveMap.js';
import { renderTractorWorkOrdersSection, bindWorkOrdersEvents, refreshWorkOrdersTractorDropdown } from './tractorWorkOrders.js';
import { renderTractorBrandsHubSection, bindBrandsHubEvents } from './tractorBrandsHub.js';

let cachedDeereState = { isConnected: false, fields: [], machines: [], organization: null };
let cachedUserFields = [];
let activeSubTab = 'telemetry'; // 'telemetry' | 'orders' | 'brands'

function ensureLeafletCss() {
    if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }
}

export async function initTractorsTab(currentUser, userData) {
    ensureLeafletCss();
    stopLiveTractorSimulation();

    const container = document.getElementById('view-tab-fields');
    if (!container) return;

    const isAdmin = currentUser && (userData?.role === 'admin' || currentUser.email === 'petrasmo@gmail.com');
    if (!isAdmin) {
        container.innerHTML = `
            <div class="bg-tractorSurface border-2 border-red-500/40 rounded-3xl p-8 text-center space-y-3 max-w-xl mx-auto mt-6">
                <span class="text-4xl block">🔒</span>
                <h3 class="font-oswald text-xl font-bold uppercase" style="color: var(--text-main);">Prieiga tik administratoriams</h3>
                <p class="text-xs text-slate-400">Ši skiltis šiuo metu yra uždaroje testavimo stadijoje.</p>
            </div>
        `;
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('jd') === 'connected') {
        showBottomToast("🦌 John Deere Operations Center sėkmingai prijungtas!");
        window.history.replaceState({ tab: 14 }, document.title, '/traktoriai');
    } else if (urlParams.get('jd_error')) {
        showDialog("John Deere ryšio informacija", urlParams.get('jd_error'), "🦌");
        window.history.replaceState({ tab: 14 }, document.title, '/traktoriai');
    }

    container.innerHTML = `
        <div class="space-y-6 w-full">
            
            <!-- VIRŠUTINĖ ANTRAŠTĖ -->
            <div class="border-b border-tractorBorder pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-600 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <span>🚜</span> Multi-Brand Telemetrija • John Deere • CLAAS • Fendt • Valtra • Case IH
                    </div>
                    <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-main);">
                        <span>🛰️</span> Savaeigė Technika ir Darbo Užduočių Centras
                    </h2>
                    <p class="text-xs md:text-sm text-slate-300">
                        Pasirinkite savo ūkio traktorių ar kombainą, atverkite jo gyvą GPS telemetrijos pultą arba nusiųskite darbo užduotį į kabiną.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button type="button" id="btn-refresh-tractor-cloud" class="h-10 px-3.5 bg-tractorBg hover:bg-tractorSurface border border-tractorBorder rounded-xl text-xs font-bold transition cursor-pointer" style="color: var(--text-main);">
                        🔄 Sinchronizuoti
                    </button>
                    <div id="top-cloud-status-pill" class="h-10 px-3.5 bg-tractorSurface border border-tractorBorder rounded-xl flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        <span>Tikrinamas Cloud...</span>
                    </div>
                </div>
            </div>

            <!-- 3 VIDINIAI SKIRTUKAI (SUB-TABS) -->
            <div class="bg-tractorSurface border border-tractorBorder p-1.5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-1.5 shadow-lg w-full">
                <button type="button" data-subtab="telemetry" class="tractor-subtab-btn h-11 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 bg-tractorPrimary text-white shadow">
                    <span>🚜</span> <span>1. Mano Technikos Parkas (GPS)</span>
                </button>
                <button type="button" data-subtab="orders" class="tractor-subtab-btn h-11 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-tractorBg">
                    <span>📋</span> <span>2. Darbo Užduotys (Dispečerinė)</span>
                    <span id="badge-orders-count" class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono">0</span>
                </button>
                <button type="button" data-subtab="brands" class="tractor-subtab-btn h-11 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-tractorBg">
                    <span>🔗</span> <span>3. Cloud Integracijos (5 Šeimos)</span>
                </button>
            </div>

            <!-- 1 SKIRTUKAS: TURIMOS TECHNIKOS SĄRAŠAS (KORTELĖS + BOTTOM SHEET PULTAS) -->
            <div id="subview-tractor-telemetry" class="w-full">
                <div id="fleet-cards-dynamic-box" class="w-full"></div>
            </div>

            <!-- 2 SKIRTUKAS: DARBO UŽDUOTYS (DISPEČERINĖ) -->
            <div id="subview-tractor-orders" class="w-full hidden">
                ${renderTractorWorkOrdersSection()}
            </div>

            <!-- 3 SKIRTUKAS: 5 PREKIŲ ŽENKLŲ ŠEIMOS IR LAUKŲ SINCHRONIZAVIMAS -->
            <div id="subview-tractor-brands" class="w-full hidden">
                <div id="brands-hub-dynamic-box" class="w-full"></div>
            </div>

        </div>
    `;

    setupSubTabsNavigation();
    await loadUserFieldsForTractors(currentUser);
    await refreshCloudStatusAndRender(currentUser, userData);

    bindWorkOrdersEvents(currentUser, userData, () => cachedUserFields, () => cachedDeereState, (newRate) => {
        setLiveTractorVraRate(newRate);
    });

    document.getElementById('btn-refresh-tractor-cloud')?.addEventListener('click', async () => {
        showBottomToast("Sinchronizuojama su technikos debesimi... 🔄", "info");
        await refreshCloudStatusAndRender(currentUser, userData);
    });
}

function setupSubTabsNavigation() {
    const views = {
        telemetry: document.getElementById('subview-tractor-telemetry'),
        orders: document.getElementById('subview-tractor-orders'),
        brands: document.getElementById('subview-tractor-brands')
    };

    document.querySelectorAll('.tractor-subtab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-subtab');
            activeSubTab = target;

            document.querySelectorAll('.tractor-subtab-btn').forEach(b => {
                if (b.getAttribute('data-subtab') === target) {
                    b.className = "tractor-subtab-btn h-11 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 bg-tractorPrimary text-white shadow";
                } else {
                    b.className = "tractor-subtab-btn h-11 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-tractorBg";
                }
            });

            Object.entries(views).forEach(([k, el]) => {
                if (!el) return;
                if (k === target) el.classList.remove('hidden');
                else el.classList.add('hidden');
            });
        });
    });
}

export function switchTractorSubTab(tabName, preselectUnitName = null) {
    const btn = document.querySelector(`.tractor-subtab-btn[data-subtab="${tabName}"]`);
    if (btn) btn.click();

    if (preselectUnitName) {
        setTimeout(() => {
            const sel = document.getElementById('order-tractor-select');
            if (sel) {
                for (let i = 0; i < sel.options.length; i++) {
                    if (sel.options[i].value.startsWith(preselectUnitName + '|')) {
                        sel.selectedIndex = i;
                        break;
                    }
                }
            }
        }, 60);
    }
}

async function loadUserFieldsForTractors(currentUser) {
    if (!currentUser) return;
    const snap = await db.collection("user_fields").where("userId", "==", currentUser.uid).get();
    cachedUserFields = [];
    snap.forEach(doc => cachedUserFields.push({ ...doc.data(), id: doc.id }));
}

async function refreshCloudStatusAndRender(currentUser, userData) {
    const pill = document.getElementById('top-cloud-status-pill');
    const brandsBox = document.getElementById('brands-hub-dynamic-box');
    const fleetBox = document.getElementById('fleet-cards-dynamic-box');

    try {
        const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/getJohnDeereData?userId=${currentUser.uid}`);
        const data = await res.json();
        console.log("🦌 John Deere API atsakymas:", data);
        cachedDeereState = data;

        if (pill) {
            if (data.isConnected && !data.needsOrgConnection) {
                const orgName = data.organization?.name || "John Deere";
                pill.innerHTML = `
                    <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    <span class="text-green-400">🦌 ${orgName} (ID: ${data.organization?.id || 'OK'})</span>
                `;
            } else if (data.isConnected && data.needsOrgConnection) {
                pill.innerHTML = `
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                    <span class="text-amber-400">🦌 Reikia patvirtinti organizaciją</span>
                `;
            } else {
                pill.innerHTML = `
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span class="text-slate-300">📱 JurgisAgro GPS / USB Režimas</span>
                `;
            }
        }
    } catch (e) {
        console.warn("John Deere statuso klaida:", e.message);
    }

    if (fleetBox) {
        fleetBox.innerHTML = renderTractorFleetCardsSection(cachedDeereState.machines || [], cachedUserFields);
        bindFleetCardsEvents(cachedUserFields, cachedDeereState.machines || []);
    }

    refreshWorkOrdersTractorDropdown(cachedDeereState.machines || []);

    if (brandsBox) {
        brandsBox.innerHTML = renderTractorBrandsHubSection(cachedDeereState, cachedUserFields);
        bindBrandsHubEvents(currentUser, cachedDeereState, cachedUserFields, () => refreshCloudStatusAndRender(currentUser, userData));
    }
}