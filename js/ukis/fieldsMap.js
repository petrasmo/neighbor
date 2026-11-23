// js/ukis/fieldsMap.js
import { db, auth } from '../core/firebase.js';
import { showBottomToast } from '../core/ui.js';

const CDSE_INSTANCE_ID = "2ecdf3ed-4338-4577-a502-11dd5b2df254";
const CDSE_WMS_URL = `https://sh.dataspace.copernicus.eu/ogc/wms/${CDSE_INSTANCE_ID}`;

let fieldsMap = null;

// 🌟 6 ATSKIRI NEPRIKLAUSOMI SLUOKSNIAI
let drawnItems = null;          // 1. Laukų ribos (poligonai)
let fieldLabelsLayer = null;    // 2. Laukų pavadinimų ir ha kortelės
let tractorsLayer = null;       // 3. Gyvi traktoriai / kombainai ir jų AB linijos
let baseMarkerLayer = null;     // 4. Mano ūkio bazė (🏠)
let silosMarkerLayer = null;    // 5. Grūdų bokštai (🛢️)
let solarMarkerLayer = null;    // 6. Saulės elektrinės (☀️)

let layerVisibility = {
    fields: true,
    labels: true,
    tractors: true,
    base: true,
    silos: true,
    solar: true
};

try {
    const savedVis = localStorage.getItem('jurgis_map_layer_vis');
    if (savedVis) {
        layerVisibility = { ...layerVisibility, ...JSON.parse(savedVis) };
    }
} catch (e) {}

let currentDrawingPolygon = null;
let drawingPoints = [];
let tempMarkers = [];
let polygonLayersMap = {};
let cachedFieldsList = [];
let cachedSelectedId = null;
let cachedCallback = null;
let cachedUserData = null;
let hasCenteredOnGarage = false;

// ============================================================================
// 🚜 UNIVERSALI MULTI-BRAND TECHNIKOS ARCHITEKTŪRA (KELI TRAKTORIAI IR KOMBAINAI VIENU METU!)
// ============================================================================
const BRAND_THEMES = {
    johndeere: {
        badge: "🦌 JDLink™ Cloud",
        terminal: "CommandCenter™ 4600",
        transmission: "AutoPowr™ IVT",
        gpsName: "StarFire™ 7000 RTK",
        accentColor: "#22C55E",
        borderColor: "#2E7D32"
    },
    claas: {
        badge: "🟢 CLAAS Connect",
        terminal: "CLAAS CEMIS™ 1200",
        transmission: "CMATIC™",
        gpsName: "SATCOR™ RTK",
        accentColor: "#84CC16",
        borderColor: "#65A30D"
    },
    agco: {
        badge: "🛡️ AGCO Fuse®",
        terminal: "FendtONE™ / SmartTouch™",
        transmission: "VarioDrive™",
        gpsName: "VarioGuide™ RTK",
        accentColor: "#10B981",
        borderColor: "#059669"
    },
    cnh: {
        badge: "🔴 CNH FieldOps™",
        terminal: "AFS Pro™ 1200",
        transmission: "CVXDrive™",
        gpsName: "AFS VectorPro™ RTK",
        accentColor: "#EF4444",
        borderColor: "#DC2626"
    }
};

let mapUnitsList = [];       // Visi žemėlapyje važiuojantys traktoriai ir kombainai
let selectedMapUnitIdx = 0;  // Kurio traktoriaus/kombaino pultas šiuo metu atidarytas
let mapTractorTimer = null;
let cachedDeereCloudMachines = [];

let isMapFullscreen = false;
let placingInfraType = null;
let onFirstPointCallback = null;
let isDrawingActive = false;

let esriBaseLayer = null;
let sentinelNdviWmsLayer = null;
let sentinelTrueColorWmsLayer = null;
let sentinelMoistureWmsLayer = null;
let streetLayer = null;
let currentBaseLayer = 'satellite';

let activeSatelliteDate = new Date().toISOString().split('T')[0];
let activeMaxCloudCover = 25;

function getSentinelTimeRange(dateStr) {
    const end = new Date(dateStr);
    const start = new Date(dateStr);
    start.setDate(start.getDate() - 30);
    return `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`;
}

export function calculatePolygonAreaHa(latLngs) {
    if (latLngs.length < 3) return 0;
    let areaM2 = 0;
    const R = 6378137;
    for (let i = 0; i < latLngs.length; i++) {
        const j = (i + 1) % latLngs.length;
        const p1 = latLngs[i];
        const p2 = latLngs[j];
        areaM2 += ((p2.lng - p1.lng) * Math.PI / 180) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }
    areaM2 = Math.abs(areaM2 * R * R / 2);
    return (areaM2 / 10000).toFixed(2);
}

export function setFirstPointCallback(fn) {
    onFirstPointCallback = fn;
}

export function initOrRefreshMap(coords, userData) {
    if (userData) cachedUserData = userData;
    const mapEl = document.getElementById('fields-map');
    if (!mapEl) return;

    if (mapTractorTimer) {
        clearInterval(mapTractorTimer);
        mapTractorTimer = null;
    }

    let initialLat = coords.lat;
    let initialLng = coords.lng;
    let initialZoom = 13;

    if (userData?.garageLat && userData?.garageLon && userData.garageLat !== 0) {
        initialLat = parseFloat(userData.garageLat);
        initialLng = parseFloat(userData.garageLon);
        initialZoom = 14;
    }

    if (fieldsMap) {
        fieldsMap.remove();
        fieldsMap = null;
    }

    fieldsMap = L.map('fields-map', { 
        zoomControl: true, 
        maxZoom: 18,
        minZoom: 6
    }).setView([initialLat, initialLng], initialZoom);

    window._leafletFieldsMapInstance = fieldsMap;

    esriBaseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri | Ⓒ NMA KPS (Geoportal.lt, 2026-09)',
        maxNativeZoom: 17,
        maxZoom: 18
    });

    sentinelNdviWmsLayer = L.tileLayer.wms(CDSE_WMS_URL, {
        layers: 'VEGETATION_INDEX',
        format: 'image/png',
        transparent: true,
        maxcc: activeMaxCloudCover,
        time: getSentinelTimeRange(activeSatelliteDate),
        tileSize: 512,
        attribution: '&copy; Copernicus Sentinel-2'
    });

    sentinelTrueColorWmsLayer = L.tileLayer.wms(CDSE_WMS_URL, {
        layers: 'TRUE_COLOR',
        format: 'image/png',
        transparent: true,
        maxcc: activeMaxCloudCover,
        time: getSentinelTimeRange(activeSatelliteDate),
        tileSize: 512,
        attribution: '&copy; Copernicus Sentinel-2'
    });

    sentinelMoistureWmsLayer = L.tileLayer.wms(CDSE_WMS_URL, {
        layers: 'MOISTURE_INDEX',
        format: 'image/png',
        transparent: true,
        maxcc: activeMaxCloudCover,
        time: getSentinelTimeRange(activeSatelliteDate),
        tileSize: 512,
        attribution: '&copy; Copernicus Sentinel-2'
    });

    streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18
    });

    esriBaseLayer.addTo(fieldsMap);

    drawnItems = new L.FeatureGroup();
    fieldLabelsLayer = new L.FeatureGroup();
    tractorsLayer = new L.FeatureGroup();
    baseMarkerLayer = new L.FeatureGroup();
    silosMarkerLayer = new L.FeatureGroup();
    solarMarkerLayer = new L.FeatureGroup();

    applyLayerVisibilityToMap();
    setupVisibilityToggleButtons();

    addLayerSwitchControl();
    addToolsAndFullscreenControl();
    addNdviLegendControl();
    addFloatingActionControl();
    ensureInfraModalExists();
    ensureUniversalTractorCockpitDrawer();

    // Nuskaitome tikras mašinas iš user_smart_devices/johndeere_{uid} (pvz., John Deere 8R 370 ir Kombainiukas!)
    loadCloudMachinesForMainMap();

    fieldsMap.on('click', (e) => {
        if (!placingInfraType) return;
        const typeToPlace = placingInfraType;
        placingInfraType = null;
        fieldsMap.getContainer().style.cursor = '';
        resetInfraButtonsStyle();
        openAddInfraModal(typeToPlace, e.latlng.lat, e.latlng.lng);
    });

    fieldsMap.on('popupopen', (e) => {
        const node = e.popup._contentNode;
        const delBtn = node.querySelector('.btn-delete-map-infra');
        if (delBtn) {
            delBtn.onclick = async () => {
                const infraId = delBtn.getAttribute('data-id');
                const infraType = delBtn.getAttribute('data-type');
                await deleteInfraItem(infraType, infraId);
                fieldsMap.closePopup();
            };
        }
    });

    setTimeout(() => {
        if (fieldsMap) {
            fieldsMap.invalidateSize();
            renderGarageMarker();
            if (cachedFieldsList.length > 0) {
                renderPolygonsInternal();
            } else {
                initAndStartMapTractor();
            }
        }
    }, 150);
}

async function loadCloudMachinesForMainMap() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const doc = await db.collection("user_smart_devices").doc(`johndeere_${user.uid}`).get();
        if (doc.exists && Array.isArray(doc.data()?.telemetry?.machines) && doc.data().telemetry.machines.length > 0) {
            cachedDeereCloudMachines = doc.data().telemetry.machines;
            initAndStartMapTractor();
        }
    } catch (e) {}
}

// ============================================================================
// 🛰️ UNIVERSALUS KABINOS TELEMETRIJOS PULTAS TIESIAI ANT „MANO LAUKAI“ ŽEMĖLAPIO
// ============================================================================
function ensureUniversalTractorCockpitDrawer() {
    const mapEl = document.getElementById('fields-map');
    if (!mapEl || document.getElementById('map-universal-cockpit-drawer')) return;

    const drawerHtml = `
        <div id="map-universal-cockpit-drawer" class="hidden" style="position: absolute; top: 52px; right: 10px; bottom: 10px; width: 355px; max-width: calc(100% - 20px); z-index: 1200; background: rgba(15, 20, 15, 0.96); border: 2px solid #2E7D32; border-radius: 18px; padding: 14px; box-shadow: 0 20px 50px rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: none; flex-direction: column; justify-content: space-between; overflow-y: auto; color: #F8FAFC; font-family: 'Inter', sans-serif;">
            
            <div>
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div id="uc-icon" style="width: 40px; height: 40px; border-radius: 12px; background: rgba(34, 197, 94, 0.18); border: 1.5px solid #22C55E; display: flex; align-items: center; justify-content: center; font-size: 20px; shrink: 0;">🚜</div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span id="uc-terminal-label" style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #4ADE80;">CommandCenter™ 4600</span>
                                <span id="uc-brand-badge" style="font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: rgba(34,197,94,0.2); color: #4ADE80; border: 1px solid rgba(34,197,94,0.4);">🦌 JDLink™</span>
                            </div>
                            <h4 id="uc-name" style="font-family: 'Oswald', sans-serif; font-size: 18px; font-weight: 700; text-transform: uppercase; margin: 1px 0 0 0; line-height: 1.15; color: #FFFFFF;">JOHN DEERE 8R 370</h4>
                            <span id="uc-sub" style="font-size: 10px; color: #94A3B8; font-family: monospace; display: block;">VIN: 1RW8370PPRD094512 • StarFire™ RTK</span>
                        </div>
                    </div>
                    <button type="button" id="btn-close-uc-drawer" style="width: 30px; height: 30px; border-radius: 8px; background: rgba(239,68,68,0.18); color: #FCA5A5; border: 1px solid rgba(239,68,68,0.4); font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; shrink: 0;" title="Uždaryti pultą">&times;</button>
                </div>

                <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px 10px; margin-bottom: 10px; font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <span style="color: #94A3B8; font-size: 10px; display: block;">📍 Dirba lauke:</span>
                        <strong id="uc-field-name" style="color: #4ADE80; font-size: 12px;">Laukas 010541-7197</strong>
                    </div>
                    <span id="uc-status-pill" style="background: rgba(34,197,94,0.2); color: #4ADE80; border: 1px solid rgba(34,197,94,0.4); padding: 3px 8px; border-radius: 8px; font-weight: 800; font-size: 10px;">
                        🟢 AutoTrac™ RTK
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                    <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px; text-align: center;">
                        <span style="font-size: 9px; color: #94A3B8; text-transform: uppercase; font-weight: 800; display: block;">Važiavimo Greitis</span>
                        <div id="uc-speed" style="font-family: 'Oswald', sans-serif; font-size: 26px; font-weight: 900; color: #4ADE80; line-height: 1.15; margin-top: 2px;">9.4 <span style="font-size: 11px; color: #94A3B8;">km/h</span></div>
                        <span id="uc-trans" style="font-size: 9px; color: #64748B; display: block;">AutoPowr™ IVT</span>
                    </div>
                    <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px; text-align: center;">
                        <span style="font-size: 9px; color: #94A3B8; text-transform: uppercase; font-weight: 800; display: block;">Variklio Sūkiai</span>
                        <div id="uc-rpm" style="font-family: 'Oswald', sans-serif; font-size: 26px; font-weight: 900; color: #FBBF24; line-height: 1.15; margin-top: 2px;">1840 <span style="font-size: 11px; color: #94A3B8;">RPM</span></div>
                        <span style="font-size: 9px; color: #64748B; display: block;">CAN-BUS ECU</span>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; margin-bottom: 10px; font-size: 11px;">
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 3px;">
                            <span style="color: #CBD5E1;">⛽ Kuro bakas</span>
                            <span id="uc-fuel-txt" style="color: #4ADE80; font-family: monospace;">78% (565 L)</span>
                        </div>
                        <div style="width: 100%; height: 7px; background: #27272A; border-radius: 999px; overflow: hidden;">
                            <div id="uc-fuel-bar" style="width: 78%; height: 100%; background: #22C55E; border-radius: 999px;"></div>
                        </div>
                    </div>

                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 3px;">
                            <span style="color: #CBD5E1;">🔥 Variklio apkrova</span>
                            <span id="uc-load-txt" style="color: #FBBF24; font-family: monospace;">76%</span>
                        </div>
                        <div style="width: 100%; height: 7px; background: #27272A; border-radius: 999px; overflow: hidden;">
                            <div id="uc-load-bar" style="width: 76%; height: 100%; background: #F59E0B; border-radius: 999px;"></div>
                        </div>
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 3px;">
                            <span style="color: #CBD5E1;">💧 AdBlue® (DEF)</span>
                            <span id="uc-def-txt" style="color: #38BDF8; font-family: monospace;">84%</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: #27272A; border-radius: 999px; overflow: hidden;">
                            <div id="uc-def-bar" style="width: 84%; height: 100%; background: #0EA5E9; border-radius: 999px;"></div>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; font-size: 11px;">
                    <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 7px 9px;">
                        <span style="font-size: 9px; color: #94A3B8; text-transform: uppercase; font-weight: 700; display: block;">Kuro Sąnaudos</span>
                        <strong id="uc-fuel-rate" style="font-family: monospace; font-size: 13px; color: #FFFFFF;">36.2 l/val.</strong>
                    </div>
                    <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 7px 9px;">
                        <span style="font-size: 9px; color: #94A3B8; text-transform: uppercase; font-weight: 700; display: block;">Aušinimo Temp.</span>
                        <strong id="uc-coolant" style="font-family: monospace; font-size: 13px; color: #4ADE80;">89 °C</strong>
                    </div>
                    <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 7px 9px;">
                        <span style="font-size: 9px; color: #94A3B8; text-transform: uppercase; font-weight: 700; display: block;">ISOBUS / Jutiklis</span>
                        <strong id="uc-vra" style="font-family: monospace; font-size: 13px; color: #FBBF24;">3000 kg/ha</strong>
                    </div>
                    <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 7px 9px;">
                        <span style="font-size: 9px; color: #94A3B8; text-transform: uppercase; font-weight: 700; display: block;">Nudirbta Lauke</span>
                        <strong id="uc-worked" style="font-family: monospace; font-size: 13px; color: #4ADE80;">4.85 ha</strong>
                    </div>
                    <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 7px 9px;">
                        <span style="font-size: 9px; color: #94A3B8; text-transform: uppercase; font-weight: 700; display: block;">Moto-valandos</span>
                        <strong id="uc-hours" style="font-family: monospace; font-size: 13px; color: #FFFFFF;">412.6 h</strong>
                    </div>
                    <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 7px 9px;">
                        <span style="font-size: 9px; color: #94A3B8; text-transform: uppercase; font-weight: 700; display: block;">GPS Tikslumas</span>
                        <strong id="uc-gps" style="font-family: monospace; font-size: 11px; color: #38BDF8;">RTK ±2.5 cm</strong>
                    </div>
                </div>
            </div>

            <button type="button" id="btn-uc-open-full-center" style="width: 100%; height: 40px; border: none; border-radius: 12px; background: #2E7D32; color: #FFFFFF; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 14px rgba(46,125,50,0.45);">
                <span>📋</span> <span>Darbo Užduotys ir VRA Siuntimas →</span>
            </button>
        </div>
    `;

    mapEl.insertAdjacentHTML('beforeend', drawerHtml);

    const drawerEl = document.getElementById('map-universal-cockpit-drawer');
    if (drawerEl && window.L) {
        L.DomEvent.disableClickPropagation(drawerEl);
        L.DomEvent.disableScrollPropagation(drawerEl);
    }

    document.getElementById('btn-close-uc-drawer')?.addEventListener('click', () => {
        closeUniversalTractorCockpit();
    });

    document.getElementById('btn-uc-open-full-center')?.addEventListener('click', () => {
        if (isMapFullscreen) toggleMapFullscreen();
        const navBtn = document.querySelector('.nav-tab-btn[data-tab="14"]');
        if (navBtn) navBtn.click();
    });
}

function openUniversalTractorCockpit(unitIdx = 0) {
    selectedMapUnitIdx = unitIdx;
    ensureUniversalTractorCockpitDrawer();
    const drawer = document.getElementById('map-universal-cockpit-drawer');
    if (!drawer) return;

    const unit = mapUnitsList[selectedMapUnitIdx] || mapUnitsList[0];
    if (!unit) return;

    const theme = BRAND_THEMES[unit.brand] || BRAND_THEMES.johndeere;
    drawer.style.borderColor = theme.borderColor;
    drawer.style.display = 'flex';
    drawer.classList.remove('hidden');

    updateUniversalCockpitHud();
}

function closeUniversalTractorCockpit() {
    const drawer = document.getElementById('map-universal-cockpit-drawer');
    if (drawer) {
        drawer.style.display = 'none';
        drawer.classList.add('hidden');
    }
}

function updateUniversalCockpitHud() {
    const drawer = document.getElementById('map-universal-cockpit-drawer');
    if (!drawer || drawer.style.display === 'none') return;

    const unit = mapUnitsList[selectedMapUnitIdx] || mapUnitsList[0];
    if (!unit) return;

    const theme = BRAND_THEMES[unit.brand] || BRAND_THEMES.johndeere;
    const isComb = unit.isCombine;
    const setTxt = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    setTxt('uc-icon', unit.icon || '🚜');
    setTxt('uc-terminal-label', isComb ? 'CommandCenter™ G5Plus' : theme.terminal);
    setTxt('uc-brand-badge', theme.badge);
    setTxt('uc-name', unit.name);
    setTxt('uc-sub', `VIN: ${unit.vin} • ${theme.gpsName}`);
    setTxt('uc-field-name', unit.fieldName);
    setTxt('uc-status-pill', `🟢 ${unit.status || 'Dirba lauke'}`);
    setTxt('uc-speed', `${unit.speedKmh.toFixed(1)} <span style="font-size: 11px; color: #94A3B8;">km/h</span>`);
    setTxt('uc-trans', isComb ? 'ProDrive™ XL' : theme.transmission);
    setTxt('uc-rpm', `${unit.rpm} <span style="font-size: 11px; color: #94A3B8;">RPM</span>`);

    const liters = Math.round((unit.fuelPct / 100) * (unit.fuelTankCapL || 725));
    setTxt('uc-fuel-txt', `${unit.fuelPct}% (${liters} L)`);
    setTxt('uc-load-txt', `${unit.engineLoadPct}%`);
    setTxt('uc-def-txt', `${unit.defLevelPct}%`);

    const loadBar = document.getElementById('uc-load-bar');
    if (loadBar) loadBar.style.width = `${unit.engineLoadPct}%`;

    setTxt('uc-fuel-rate', `${unit.fuelLh} l/val.`);
    setTxt('uc-coolant', `${unit.coolantTempC} °C`);
    setTxt('uc-vra', isComb ? `Drėgmė 14.2%` : `${unit.vraRate} kg/ha`);
    setTxt('uc-worked', `${unit.workedHa.toFixed(2)} ha`);
    setTxt('uc-hours', `${Number(unit.engineHours).toFixed(1)} h`);
    setTxt('uc-gps', `${unit.lat.toFixed(4)}, ${unit.lng.toFixed(4)}`);
}

// ============================================================================
// 👁️ 6 SLUOKSNIŲ ĮJUNGIMO / IŠJUNGIMO VALDYMAS
// ============================================================================
function applyLayerVisibilityToMap() {
    if (!fieldsMap) return;

    const toggleLayer = (layer, isVisible) => {
        if (!layer) return;
        if (isVisible) {
            if (!fieldsMap.hasLayer(layer)) fieldsMap.addLayer(layer);
        } else {
            if (fieldsMap.hasLayer(layer)) fieldsMap.removeLayer(layer);
        }
    };

    toggleLayer(drawnItems, layerVisibility.fields);
    toggleLayer(fieldLabelsLayer, layerVisibility.labels);
    toggleLayer(tractorsLayer, layerVisibility.tractors);
    toggleLayer(baseMarkerLayer, layerVisibility.base);
    toggleLayer(silosMarkerLayer, layerVisibility.silos);
    toggleLayer(solarMarkerLayer, layerVisibility.solar);

    if (!layerVisibility.tractors) {
        closeUniversalTractorCockpit();
    }
}

function setupVisibilityToggleButtons() {
    const updateButtonsUi = () => {
        document.querySelectorAll('.map-vis-toggle-btn').forEach(btn => {
            const key = btn.getAttribute('data-layer-toggle');
            const isOn = !!layerVisibility[key];
            if (isOn) {
                btn.style.background = '#2E7D32';
                btn.style.color = '#FFFFFF';
                btn.style.borderColor = '#1B5E20';
                btn.style.opacity = '1';
            } else {
                btn.style.background = 'var(--bg-surface)';
                btn.style.color = 'var(--text-muted)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.opacity = '0.75';
            }
        });
    };

    updateButtonsUi();

    document.querySelectorAll('.map-vis-toggle-btn').forEach(btn => {
        btn.onclick = () => {
            const key = btn.getAttribute('data-layer-toggle');
            layerVisibility[key] = !layerVisibility[key];
            try {
                localStorage.setItem('jurgis_map_layer_vis', JSON.stringify(layerVisibility));
            } catch (e) {}
            updateButtonsUi();
            applyLayerVisibilityToMap();
        };
    });

    // Paspaudus „🎯 Kur traktorius?“ paeiliui peršoka per visas mašinas (John Deere 8R 370 -> Kombainiukas -> ...)
    const focusTractorBtn = document.getElementById('btn-focus-map-tractor');
    if (focusTractorBtn) {
        focusTractorBtn.onclick = () => {
            if (!layerVisibility.tractors) {
                layerVisibility.tractors = true;
                updateButtonsUi();
                applyLayerVisibilityToMap();
            }
            if (mapUnitsList.length === 0) return;

            const drawer = document.getElementById('map-universal-cockpit-drawer');
            const isDrawerOpen = drawer && drawer.style.display !== 'none';
            if (isDrawerOpen && mapUnitsList.length > 1) {
                selectedMapUnitIdx = (selectedMapUnitIdx + 1) % mapUnitsList.length;
            }

            const u = mapUnitsList[selectedMapUnitIdx] || mapUnitsList[0];
            if (fieldsMap && u.lat && u.lng) {
                fieldsMap.setView([u.lat, u.lng], 17, { animate: true });
                openUniversalTractorCockpit(selectedMapUnitIdx);
            }
        };
    }
}

// ============================================================================
// 🚜 GYVI TRAKTORIAI IR KOMBAINAI PAGRINDINIAME „MANO LAUKAI“ ŽEMĖLAPYJE
// ============================================================================
function initAndStartMapTractor() {
    if (!tractorsLayer || !fieldsMap) return;
    tractorsLayer.clearLayers();
    mapUnitsList = [];

    const validFields = cachedFieldsList.filter(f => f.polygonCoordinates && f.polygonCoordinates.length >= 3);

    // Jei iš John Deere Cloud gavome tikras mašinas (pvz., John Deere 8R 370 ir Kombainiukas) – rodome jas visas!
    const rawMachines = cachedDeereCloudMachines.length > 0
        ? cachedDeereCloudMachines
        : [{ id: "jd_8r_370", name: "John Deere 8R 370", vin: "1RW8370PPRD094512", category: "Tractor" }];

    rawMachines.forEach((m, idx) => {
        const isComb = (m.category || '').toLowerCase().includes('combine') || (m.name || '').toLowerCase().includes('kombain') || (m.model || '').toUpperCase().includes('S7');
        const targetField = validFields[idx % Math.max(1, validFields.length)];

        let coords = [];
        let fieldName = "Laukas";
        if (targetField) {
            coords = targetField.polygonCoordinates.map(p => [
                Number(Array.isArray(p) ? p[0] : p.lat),
                Number(Array.isArray(p) ? p[1] : p.lng)
            ]).filter(c => c[0] && c[1]);
            fieldName = targetField.name;
        } else if (cachedUserData?.garageLat && cachedUserData?.garageLon) {
            const gLat = parseFloat(cachedUserData.garageLat) + idx * 0.002;
            const gLng = parseFloat(cachedUserData.garageLon);
            coords = [
                [gLat + 0.0012, gLng - 0.0015],
                [gLat + 0.0012, gLng + 0.0015],
                [gLat - 0.0012, gLng + 0.0015],
                [gLat - 0.0012, gLng - 0.0015]
            ];
            fieldName = "Prie ūkio bazės";
        } else {
            return;
        }

        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        coords.forEach(([lat, lng]) => {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
        });

        const padLat = (maxLat - minLat) * 0.16;
        const padLng = (maxLng - minLng) * 0.16;
        const sLat = minLat + padLat;
        const eLat = maxLat - padLat;
        const sLng = minLng + padLng;
        const eLng = maxLng - padLng;

        const passes = 5;
        const waypoints = [];
        for (let i = 0; i < passes; i++) {
            const frac = i / (passes - 1);
            const curLat = sLat + (eLat - sLat) * frac;
            if (i % 2 === 0) {
                waypoints.push([curLat, sLng]);
                waypoints.push([curLat, eLng]);
            } else {
                waypoints.push([curLat, eLng]);
                waypoints.push([curLat, sLng]);
            }
        }

        const pA = waypoints[0];
        const pB = waypoints[1];
        const startProg = 0.25 + (idx * 0.2) % 0.5;
        const startLat = pA[0] + (pB[0] - pA[0]) * startProg;
        const startLng = pA[1] + (pB[1] - pA[1]) * startProg;
        const trailCoords = [pA, [startLat, startLng]];

        const unitObj = {
            id: m.id || `unit_${idx}`,
            brand: "johndeere",
            isCombine: isComb,
            icon: isComb ? "🌾" : "🚜",
            name: m.name || "John Deere 8R 370",
            vin: m.vin || "JDLink",
            status: isComb ? "Kulia derlių (AutoTrac™)" : "AutoTrac™ RTK",
            speedKmh: isComb ? 6.4 : 9.4,
            rpm: isComb ? 2100 : 1840,
            fuelPct: isComb ? 80 : 78,
            fuelTankCapL: isComb ? 1250 : 725,
            fuelLh: isComb ? 52.4 : 36.2,
            engineLoadPct: isComb ? 84 : 76,
            coolantTempC: 89,
            defLevelPct: 85,
            batteryVolts: 14.1,
            engineHours: m.engineHours ? parseFloat(m.engineHours) : 412.6,
            vraRate: isComb ? 0 : 3000,
            workedHa: isComb ? 5.29 : 4.85,
            fieldName: fieldName,
            lat: startLat,
            lng: startLng,
            heading: 90,
            waypoints: waypoints,
            wpIdx: 0,
            progress: startProg,
            trailCoords: trailCoords,
            marker: null,
            trailLine: null
        };

        unitObj.trailLine = L.polyline(trailCoords, {
            color: isComb ? '#FACC15' : '#4ADE80',
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 4',
            lineCap: 'round'
        }).addTo(tractorsLayer);

        unitObj.marker = L.marker([startLat, startLng], {
            icon: getMapUnitIcon(unitObj),
            zIndexOffset: 1500 + idx
        }).addTo(tractorsLayer);

        unitObj.marker.on('click', () => {
            openUniversalTractorCockpit(idx);
        });

        mapUnitsList.push(unitObj);
    });

    if (mapTractorTimer) clearInterval(mapTractorTimer);
    mapTractorTimer = setInterval(() => {
        if (!fieldsMap || mapUnitsList.length === 0) return;

        mapUnitsList.forEach(u => {
            if (u.waypoints.length < 2) return;

            const nextIdx = (u.wpIdx + 1) % u.waypoints.length;
            const isTurn = u.wpIdx % 2 === 1;
            u.progress += isTurn ? 0.08 : 0.025;

            if (u.progress >= 1) {
                u.progress = 0;
                u.wpIdx = nextIdx;
            }

            const cA = u.waypoints[u.wpIdx];
            const cB = u.waypoints[(u.wpIdx + 1) % u.waypoints.length];

            const nLat = cA[0] + (cB[0] - cA[0]) * u.progress;
            const nLng = cA[1] + (cB[1] - cA[1]) * u.progress;

            u.lat = nLat;
            u.lng = nLng;
            u.speedKmh = isTurn ? +(4.6 + Math.random() * 0.5).toFixed(1) : (u.isCombine ? +(6.4 + Math.random() * 0.5).toFixed(1) : +(9.3 + Math.random() * 0.5).toFixed(1));
            u.rpm = isTurn ? Math.round(1450 + Math.random() * 40) : (u.isCombine ? Math.round(2100 + Math.random() * 40) : Math.round(1830 + Math.random() * 40));
            u.engineLoadPct = isTurn ? Math.round(52 + Math.random() * 6) : (u.isCombine ? Math.round(83 + Math.random() * 6) : Math.round(75 + Math.random() * 7));
            u.fuelLh = isTurn ? +(22.0 + Math.random() * 1.5).toFixed(1) : (u.isCombine ? +(51.5 + Math.random() * 2.0).toFixed(1) : +(36.0 + Math.random() * 1.8).toFixed(1));
            u.status = isTurn ? "Apsisuka galulaukėje" : (u.isCombine ? "Kulia derlių (AutoTrac™)" : "AutoTrac™ RTK");
            u.workedHa = +(u.workedHa + 0.01).toFixed(2);

            u.trailCoords.push([nLat, nLng]);
            if (u.trailCoords.length > 100) u.trailCoords.shift();

            if (u.marker) {
                u.marker.setLatLng([nLat, nLng]);
                u.marker.setIcon(getMapUnitIcon(u));
            }
            if (u.trailLine) {
                u.trailLine.setLatLngs(u.trailCoords);
            }
        });

        const statusFooter = document.getElementById('fields-map-tractor-status');
        if (statusFooter && mapUnitsList.length > 0) {
            statusFooter.textContent = mapUnitsList.map(u => `${u.icon} ${u.name}: ${u.fieldName} (${u.speedKmh.toFixed(1)} km/h)`).join('  •  ');
        }
        updateUniversalCockpitHud();
    }, 1200);
}

function getMapUnitIcon(u) {
    const borderCol = u.isCombine ? '#FACC15' : '#22C55E';
    return L.divIcon({
        className: 'custom-fields-tractor-icon',
        html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); cursor: pointer;">
                <div style="background: rgba(15, 23, 15, 0.95); color: #4ADE80; border: 1.5px solid ${borderCol}; padding: 2px 7px; border-radius: 999px; font-size: 10px; font-weight: 900; white-space: nowrap; margin-bottom: 3px; box-shadow: 0 3px 10px rgba(0,0,0,0.75); font-family: monospace;">
                    ${u.icon} ${u.name} • ${u.speedKmh.toFixed(1)} km/h
                </div>
                <div style="width: 38px; height: 38px; border-radius: 50%; background: radial-gradient(circle, #16A34A 0%, #14532D 100%); border: 2.5px solid #FACC15; box-shadow: 0 0 18px rgba(34, 197, 94, 0.9); display: flex; align-items: center; justify-content: center; font-size: 19px;">
                    ${u.icon}
                </div>
            </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
}

// 🌟 KAIRYSIS VALDYMO BLOKAS: PILNAS EKRANAS + BOKŠTO IR SAULĖS ELEKTRINĖS ŽYMĖJIMAS
function addToolsAndFullscreenControl() {
    const ToolsControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.border = 'none';
            container.style.background = 'transparent';

            container.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px;">
                    <button type="button" id="btn-map-fullscreen" style="background: rgba(15,18,15,0.95); color: #FFFFFF; border: 2px solid #2E7D32; padding: 6px 10px; border-radius: 10px; font-weight: 800; font-size: 11px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.7); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <span id="fs-icon" style="font-size: 14px;">⛶</span> <span id="fs-text">Pilnas ekranas</span>
                    </button>

                    <button type="button" id="btn-map-place-silo" style="background: rgba(15,18,15,0.95); color: #38BDF8; border: 1.5px solid #0284C7; padding: 6px 10px; border-radius: 10px; font-weight: 800; font-size: 11px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.7); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <span style="font-size: 14px;">🛢️</span> <span>+Bokštas</span>
                    </button>

                    <button type="button" id="btn-map-place-solar" style="background: rgba(15,18,15,0.95); color: #FBBF24; border: 1.5px solid #D97706; padding: 6px 10px; border-radius: 10px; font-weight: 800; font-size: 11px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.7); display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        <span style="font-size: 14px;">☀️</span> <span>+Saulės el.</span>
                    </button>
                </div>
            `;

            L.DomEvent.disableClickPropagation(container);

            setTimeout(() => {
                const fsBtn = document.getElementById('btn-map-fullscreen');
                const siloBtn = document.getElementById('btn-map-place-silo');
                const solarBtn = document.getElementById('btn-map-place-solar');

                if (fsBtn) {
                    fsBtn.onclick = () => toggleMapFullscreen();
                }

                if (siloBtn) {
                    siloBtn.onclick = () => {
                        if (!auth.currentUser) {
                            showBottomToast("Prisijunkite, kad galėtumėte pažymėti grūdų bokštą!", "warning");
                            return;
                        }
                        if (placingInfraType === 'silo') {
                            placingInfraType = null;
                            fieldsMap.getContainer().style.cursor = '';
                            resetInfraButtonsStyle();
                        } else {
                            stopDrawing();
                            placingInfraType = 'silo';
                            fieldsMap.getContainer().style.cursor = 'crosshair';
                            resetInfraButtonsStyle();
                            siloBtn.style.background = '#0284C7';
                            siloBtn.style.color = '#FFFFFF';
                            showBottomToast("🛢️ Spustelėkite ant žemėlapio, kur stovi jūsų Grūdų bokštas!", "info");
                        }
                    };
                }

                if (solarBtn) {
                    solarBtn.onclick = () => {
                        if (!auth.currentUser) {
                            showBottomToast("Prisijunkite, kad galėtumėte pažymėti saulės elektrinę!", "warning");
                            return;
                        }
                        if (placingInfraType === 'solar') {
                            placingInfraType = null;
                            fieldsMap.getContainer().style.cursor = '';
                            resetInfraButtonsStyle();
                        } else {
                            stopDrawing();
                            placingInfraType = 'solar';
                            fieldsMap.getContainer().style.cursor = 'crosshair';
                            resetInfraButtonsStyle();
                            solarBtn.style.background = '#D97706';
                            solarBtn.style.color = '#FFFFFF';
                            showBottomToast("☀️ Spustelėkite ant žemėlapio, kur yra jūsų Saulės elektrinė!", "info");
                        }
                    };
                }
            }, 100);

            return container;
        }
    });

    fieldsMap.addControl(new ToolsControl());
}

function resetInfraButtonsStyle() {
    const siloBtn = document.getElementById('btn-map-place-silo');
    const solarBtn = document.getElementById('btn-map-place-solar');
    if (siloBtn) {
        siloBtn.style.background = 'rgba(15,18,15,0.95)';
        siloBtn.style.color = '#38BDF8';
    }
    if (solarBtn) {
        solarBtn.style.background = 'rgba(15,18,15,0.95)';
        solarBtn.style.color = '#FBBF24';
    }
}

function toggleMapFullscreen() {
    const cardEl = document.getElementById('fields-map-card-container');
    const mapEl = document.getElementById('fields-map');
    const fsIcon = document.getElementById('fs-icon');
    const fsText = document.getElementById('fs-text');
    const fsBtn = document.getElementById('btn-map-fullscreen');
    if (!mapEl || !fieldsMap) return;

    const targetContainer = cardEl || mapEl;
    isMapFullscreen = !isMapFullscreen;

    if (isMapFullscreen) {
        targetContainer.style.position = 'fixed';
        targetContainer.style.top = '0';
        targetContainer.style.left = '0';
        targetContainer.style.right = '0';
        targetContainer.style.bottom = '0';
        targetContainer.style.width = '100vw';
        targetContainer.style.height = '100dvh';
        targetContainer.style.zIndex = '9990';
        targetContainer.style.borderRadius = '0';
        targetContainer.style.margin = '0';

        mapEl.style.flex = '1 1 auto';
        mapEl.style.height = '100%';
        mapEl.style.minHeight = '300px';

        if (fsIcon) fsIcon.textContent = '✕';
        if (fsText) fsText.textContent = 'Sumažinti ekraną';
        if (fsBtn) fsBtn.style.background = '#DC2626';
    } else {
        targetContainer.style.position = '';
        targetContainer.style.top = '';
        targetContainer.style.left = '';
        targetContainer.style.right = '';
        targetContainer.style.bottom = '';
        targetContainer.style.width = '';
        targetContainer.style.height = '';
        targetContainer.style.zIndex = '';
        targetContainer.style.borderRadius = '';
        targetContainer.style.margin = '';

        mapEl.style.flex = '';
        mapEl.style.height = '520px';
        mapEl.style.minHeight = '520px';

        if (fsIcon) fsIcon.textContent = '⛶';
        if (fsText) fsText.textContent = 'Pilnas ekranas';
        if (fsBtn) fsBtn.style.background = 'rgba(15,18,15,0.95)';
    }

    setTimeout(() => {
        if (fieldsMap) fieldsMap.invalidateSize();
    }, 150);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMapFullscreen) {
        toggleMapFullscreen();
    }
});

function ensureInfraModalExists() {
    if (document.getElementById('map-infra-modal')) return;

    const modalHtml = `
        <div id="map-infra-modal" class="fixed inset-0 bg-black/80 z-[10000] hidden flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div class="flex justify-between items-center border-b border-tractorBorder pb-3">
                    <div class="flex items-center gap-2">
                        <span id="infra-modal-icon" class="text-2xl">🛢️</span>
                        <h3 id="infra-modal-title" class="font-oswald text-lg font-bold uppercase tracking-wider" style="color: var(--text-main);">
                            Pridėti objektą
                        </h3>
                    </div>
                    <button type="button" id="btn-close-infra-modal" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer leading-none">&times;</button>
                </div>

                <form id="map-infra-form" class="space-y-3.5 text-xs">
                    <input type="hidden" id="infra-type-input" value="silo">
                    <input type="hidden" id="infra-lat-input" value="0">
                    <input type="hidden" id="infra-lng-input" value="0">

                    <div class="space-y-1">
                        <label id="infra-name-label" class="font-bold uppercase text-slate-400 block">Pavadinimas *</label>
                        <input id="infra-name-input" type="text" required placeholder="Pvz.: Bokštas #1 (500t)"
                            class="w-full h-11 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl px-3.5 text-xs font-bold outline-none" style="color: var(--text-main);">
                    </div>

                    <div id="infra-extra-box" class="space-y-1 hidden">
                        <label class="font-bold uppercase text-amber-500 block">Galia (kW / kWp)</label>
                        <input id="infra-power-input" type="number" step="0.5" value="7.0"
                            class="w-full h-11 bg-tractorBg border border-tractorBorder rounded-xl px-3.5 text-xs font-mono font-bold outline-none" style="color: var(--text-main);">
                    </div>

                    <div class="pt-2 flex gap-2">
                        <button type="submit" class="w-full h-11 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer transition">
                            💾 Išsaugoti žemėlapyje
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('map-infra-modal');
    const closeBtn = document.getElementById('btn-close-infra-modal');
    const form = document.getElementById('map-infra-form');

    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
    if (modal) modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const type = document.getElementById('infra-type-input').value;
            const lat = parseFloat(document.getElementById('infra-lat-input').value);
            const lng = parseFloat(document.getElementById('infra-lng-input').value);
            const name = document.getElementById('infra-name-input').value.trim();
            const powerKw = parseFloat(document.getElementById('infra-power-input').value) || 7.0;

            if (!cachedUserData) cachedUserData = {};

            if (type === 'silo') {
                if (!Array.isArray(cachedUserData.silos)) cachedUserData.silos = [];
                cachedUserData.silos.push({
                    id: 'silo_' + Date.now(),
                    name: name || 'Grūdų bokštas',
                    lat,
                    lng
                });
                await db.collection("users").doc(user.uid).update({ silos: cachedUserData.silos });
                showBottomToast(`🛢️ Bokštas „${name}“ pažymėtas žemėlapyje!`);
            } else {
                if (!Array.isArray(cachedUserData.solarPlants)) cachedUserData.solarPlants = [];
                cachedUserData.solarPlants.push({
                    id: 'solar_' + Date.now(),
                    name: name || 'Saulės elektrinė',
                    powerKw: powerKw,
                    lat,
                    lng
                });
                await db.collection("users").doc(user.uid).update({ solarPlants: cachedUserData.solarPlants });
                showBottomToast(`☀️ Saulės elektrinė „${name}“ (${powerKw} kW) pažymėta žemėlapyje!`);
            }

            modal.classList.add('hidden');
            renderGarageMarker();
        };
    }
}

function openAddInfraModal(type, lat, lng) {
    ensureInfraModalExists();
    const modal = document.getElementById('map-infra-modal');
    const iconEl = document.getElementById('infra-modal-icon');
    const titleEl = document.getElementById('infra-modal-title');
    const nameInp = document.getElementById('infra-name-input');
    const extraBox = document.getElementById('infra-extra-box');

    document.getElementById('infra-type-input').value = type;
    document.getElementById('infra-lat-input').value = lat;
    document.getElementById('infra-lng-input').value = lng;

    if (type === 'silo') {
        if (iconEl) iconEl.textContent = '🛢️';
        if (titleEl) titleEl.textContent = 'Naujas Grūdų Bokštas';
        if (nameInp) nameInp.value = `Bokštas #${(cachedUserData?.silos?.length || 0) + 1}`;
        extraBox?.classList.add('hidden');
    } else {
        if (iconEl) iconEl.textContent = '☀️';
        if (titleEl) titleEl.textContent = 'Nauja Saulės Elektrinė';
        if (nameInp) nameInp.value = `Saulės elektrinė #${(cachedUserData?.solarPlants?.length || 0) + 1}`;
        extraBox?.classList.remove('hidden');
    }

    modal?.classList.remove('hidden');
    setTimeout(() => nameInp?.focus(), 50);
}

async function deleteInfraItem(type, id) {
    const user = auth.currentUser;
    if (!user || !cachedUserData) return;

    if (type === 'silo' && Array.isArray(cachedUserData.silos)) {
        cachedUserData.silos = cachedUserData.silos.filter(s => s.id !== id);
        await db.collection("users").doc(user.uid).update({ silos: cachedUserData.silos });
        showBottomToast("🛢️ Bokštas pašalintas iš žemėlapio.");
    } else if (type === 'solar' && Array.isArray(cachedUserData.solarPlants)) {
        cachedUserData.solarPlants = cachedUserData.solarPlants.filter(s => s.id !== id);
        await db.collection("users").doc(user.uid).update({ solarPlants: cachedUserData.solarPlants });
        showBottomToast("☀️ Saulės elektrinė pašalinta iš žemėlapio.");
    }
    renderGarageMarker();
}

function addFloatingActionControl() {
    const FabControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.border = 'none';
            container.style.background = 'transparent';

            container.innerHTML = `
                <div id="map-fab-wrap" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; margin-right: 12px;">
                    <button type="button" id="btn-map-fab-add" style="width: 50px; height: 50px; border-radius: 50%; background: #2E7D32; color: #FFFFFF; font-size: 24px; font-weight: bold; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 18px rgba(0,0,0,0.7); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Brėžti naują lauką">
                        ➕
                    </button>
                    <button type="button" id="btn-map-fab-save" style="display: none; width: 50px; height: 50px; border-radius: 50%; background: #16A34A; color: #FFFFFF; font-size: 24px; font-weight: bold; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 18px rgba(0,0,0,0.7); cursor: pointer; align-items: center; justify-content: center; transition: all 0.2s;" title="Patvirtinti ir išsaugoti lauką">
                        ✓
                    </button>
                    <button type="button" id="btn-map-fab-cancel" style="display: none; width: 40px; height: 40px; border-radius: 50%; background: #DC2626; color: #FFFFFF; font-size: 18px; font-weight: bold; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 14px rgba(0,0,0,0.7); cursor: pointer; align-items: center; justify-content: center; transition: all 0.2s;" title="Atšaukti">
                        ✕
                    </button>
                </div>
            `;

            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });

    fieldsMap.addControl(new FabControl());
}

export function updateFabUi(isDrawing) {
    isDrawingActive = isDrawing;
    const addBtn = document.getElementById('btn-map-fab-add');
    const saveBtn = document.getElementById('btn-map-fab-save');
    const cancelBtn = document.getElementById('btn-map-fab-cancel');

    if (addBtn && saveBtn && cancelBtn) {
        if (isDrawing) {
            addBtn.style.display = 'none';
            saveBtn.style.display = 'flex';
            cancelBtn.style.display = 'flex';
        } else {
            addBtn.style.display = 'flex';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        }
    }
}

function addLayerSwitchControl() {
    const customControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.innerHTML = `
                <div style="background: rgba(15,18,15,0.95); padding: 5px; border-radius: 12px; border: 1.5px solid #2E7D32; display: flex; flex-wrap: wrap; gap: 4px; box-shadow: 0 6px 18px rgba(0,0,0,0.6);">
                    <button id="btn-layer-sat" style="background: #2E7D32; color: #fff; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🌍 Bazinė HD</button>
                    <button id="btn-layer-ndvi" style="background: transparent; color: #4ADE80; border: 1px solid #2E7D32; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🌿 NDVI</button>
                    <button id="btn-layer-truecolor" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🛰️ Sentinel</button>
                    <button id="btn-layer-moisture" style="background: transparent; color: #60A5FA; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">💧 Drėgmė</button>
                    <button id="btn-layer-street" style="background: transparent; color: #CBD5E1; border: none; padding: 5px 9px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer;">🗺️ Keliai</button>
                </div>
            `;

            L.DomEvent.disableClickPropagation(container);

            setTimeout(() => {
                const btnSat = document.getElementById('btn-layer-sat');
                const btnNdvi = document.getElementById('btn-layer-ndvi');
                const btnTrueColor = document.getElementById('btn-layer-truecolor');
                const btnMoisture = document.getElementById('btn-layer-moisture');
                const btnStreet = document.getElementById('btn-layer-street');
                const legendEl = document.getElementById('map-ndvi-legend');

                const resetBtnStyles = () => {
                    [btnSat, btnNdvi, btnTrueColor, btnMoisture, btnStreet].forEach(b => {
                        if (b) { b.style.background = 'transparent'; b.style.color = '#CBD5E1'; b.style.border = 'none'; }
                    });
                };

                if (btnSat) {
                    btnSat.onclick = () => {
                        clearAllBaseLayers();
                        fieldsMap.addLayer(esriBaseLayer);
                        currentBaseLayer = 'satellite';
                        resetBtnStyles();
                        btnSat.style.background = '#2E7D32';
                        btnSat.style.color = '#fff';
                        if (legendEl) legendEl.style.display = 'none';
                        ensurePolygonsOnTop();
                    };
                }

                if (btnNdvi) {
                    btnNdvi.onclick = () => {
                        clearAllBaseLayers();
                        fieldsMap.addLayer(esriBaseLayer);
                        fieldsMap.addLayer(sentinelNdviWmsLayer);
                        currentBaseLayer = 'sentinel-ndvi';
                        resetBtnStyles();
                        btnNdvi.style.background = '#15803D';
                        btnNdvi.style.color = '#fff';
                        if (legendEl) legendEl.style.display = 'block';
                        ensurePolygonsOnTop();
                    };
                }

                if (btnTrueColor) {
                    btnTrueColor.onclick = () => {
                        clearAllBaseLayers();
                        fieldsMap.addLayer(esriBaseLayer);
                        fieldsMap.addLayer(sentinelTrueColorWmsLayer);
                        currentBaseLayer = 'sentinel-truecolor';
                        resetBtnStyles();
                        btnTrueColor.style.background = '#2E7D32';
                        btnTrueColor.style.color = '#fff';
                        if (legendEl) legendEl.style.display = 'none';
                        ensurePolygonsOnTop();
                    };
                }

                if (btnMoisture) {
                    btnMoisture.onclick = () => {
                        clearAllBaseLayers();
                        fieldsMap.addLayer(esriBaseLayer);
                        fieldsMap.addLayer(sentinelMoistureWmsLayer);
                        currentBaseLayer = 'sentinel-moisture';
                        resetBtnStyles();
                        btnMoisture.style.background = '#1E40AF';
                        btnMoisture.style.color = '#fff';
                        if (legendEl) legendEl.style.display = 'none';
                        ensurePolygonsOnTop();
                    };
                }

                if (btnStreet) {
                    btnStreet.onclick = () => {
                        clearAllBaseLayers();
                        fieldsMap.addLayer(streetLayer);
                        currentBaseLayer = 'street';
                        resetBtnStyles();
                        btnStreet.style.background = '#334155';
                        btnStreet.style.color = '#fff';
                        if (legendEl) legendEl.style.display = 'none';
                        ensurePolygonsOnTop();
                    };
                }
            }, 100);

            return container;
        }
    });

    fieldsMap.addControl(new customControl());
}

function clearAllBaseLayers() {
    if (!fieldsMap) return;
    [esriBaseLayer, sentinelNdviWmsLayer, sentinelTrueColorWmsLayer, sentinelMoistureWmsLayer, streetLayer].forEach(layer => {
        if (layer && fieldsMap.hasLayer(layer)) {
            fieldsMap.removeLayer(layer);
        }
    });
}

function ensurePolygonsOnTop() {
    if (drawnItems) drawnItems.bringToFront();
    if (tractorsLayer) tractorsLayer.bringToFront();
}

export function updateSentinelFilter(dateStr, maxCloudCover = 25) {
    activeSatelliteDate = dateStr || activeSatelliteDate;
    activeMaxCloudCover = maxCloudCover;

    const timeRange = getSentinelTimeRange(activeSatelliteDate);

    if (sentinelNdviWmsLayer) sentinelNdviWmsLayer.setParams({ time: timeRange, maxcc: activeMaxCloudCover });
    if (sentinelTrueColorWmsLayer) sentinelTrueColorWmsLayer.setParams({ time: timeRange, maxcc: activeMaxCloudCover });
    if (sentinelMoistureWmsLayer) sentinelMoistureWmsLayer.setParams({ time: timeRange, maxcc: activeMaxCloudCover });
}

function addNdviLegendControl() {
    const legendControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.id = 'map-ndvi-legend';
            container.style.display = 'none';
            container.innerHTML = `
                <div style="background: rgba(15,18,15,0.95); padding: 8px 10px; border-radius: 10px; border: 1.5px solid #2E7D32; color: #fff; font-size: 10px; space-y: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.7); min-width: 190px;">
                    <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: #4ADE80; border-bottom: 1px solid #2E382E; padding-bottom: 3px; margin-bottom: 4px;">
                        🌾 Sentinel-2 Agro NDVI
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 2px; background: #15803D;"></span>
                        <span style="font-weight: bold; margin-left: 6px; flex: 1;">0.70 – 1.0 (Vešli)</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 2px; background: #22C55E;"></span>
                        <span style="font-weight: bold; margin-left: 6px; flex: 1;">0.55 – 0.70 (Sveika)</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 2px; background: #FACC15;"></span>
                        <span style="font-weight: bold; margin-left: 6px; flex: 1;">0.40 – 0.55 (Vidutinis)</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 2px; background: #DC2626;"></span>
                        <span style="font-weight: bold; margin-left: 6px; flex: 1;">< 0.25 (Plika dirva)</span>
                    </div>
                </div>
            `;
            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });

    fieldsMap.addControl(new legendControl());
}

export function renderGarageMarker() {
    if (!fieldsMap) return;
    if (baseMarkerLayer) baseMarkerLayer.clearLayers();
    if (silosMarkerLayer) silosMarkerLayer.clearLayers();
    if (solarMarkerLayer) solarMarkerLayer.clearLayers();

    if (cachedUserData?.garageLat && cachedUserData?.garageLon && cachedUserData.garageLat !== 0 && baseMarkerLayer) {
        const lat = parseFloat(cachedUserData.garageLat);
        const lng = parseFloat(cachedUserData.garageLon);

        const garageIcon = L.divIcon({
            className: 'custom-garage-icon',
            html: `<div style="background: #121412; border: 2.5px solid #FFD700; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">🏠</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const marker = L.marker([lat, lng], { icon: garageIcon }).addTo(baseMarkerLayer);

        marker.bindTooltip(`
            <div style="background: rgba(0,0,0,0.9); color: #FFD700; padding: 4px 8px; border-radius: 6px; border: 1px solid #FFD700; font-weight: bold; font-size: 11px; text-align: center;">
                🚜 Mano ūkio bazė
            </div>
        `, { permanent: true, direction: 'top', offset: [0, -15] });

        if (!hasCenteredOnGarage) {
            fieldsMap.setView([lat, lng], 14);
            hasCenteredOnGarage = true;
        }
    }

    const silos = cachedUserData?.silos || [];
    if (silosMarkerLayer) {
        silos.forEach(silo => {
            if (!silo.lat || !silo.lng) return;
            const siloIcon = L.divIcon({
                className: 'custom-silo-map-icon',
                html: `<div style="background: #0F172A; border: 2.5px solid #38BDF8; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 17px; box-shadow: 0 4px 12px rgba(0,0,0,0.85); cursor: pointer;">🛢️</div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            });

            const sMarker = L.marker([parseFloat(silo.lat), parseFloat(silo.lng)], { icon: siloIcon }).addTo(silosMarkerLayer);

            sMarker.bindTooltip(`
                <div style="background: rgba(15,23,42,0.92); color: #38BDF8; padding: 3px 7px; border-radius: 6px; border: 1px solid #38BDF8; font-weight: 800; font-size: 10px; text-align: center;">
                    🛢️ ${silo.name}
                </div>
            `, { permanent: true, direction: 'top', offset: [0, -14] });

            sMarker.bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px; min-width: 150px; padding: 2px;">
                    <strong style="display: block; color: #0284C7; margin-bottom: 4px;">🛢️ ${silo.name}</strong>
                    <div style="font-size: 10px; color: #64748B; margin-bottom: 8px;">GPS: ${Number(silo.lat).toFixed(4)}, ${Number(silo.lng).toFixed(4)}</div>
                    <button type="button" class="btn-delete-map-infra" data-type="silo" data-id="${silo.id}" style="width: 100%; background: #DC2626; color: #fff; border: none; padding: 5px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
                        🗑️ Pašalinti bokštą
                    </button>
                </div>
            `);
        });
    }

    const solarPlants = cachedUserData?.solarPlants || [];
    if (solarMarkerLayer) {
        solarPlants.forEach(sol => {
            if (!sol.lat || !sol.lng) return;
            const solarIcon = L.divIcon({
                className: 'custom-solar-map-icon',
                html: `<div style="background: #1C1917; border: 2.5px solid #FBBF24; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 17px; box-shadow: 0 4px 12px rgba(0,0,0,0.85); cursor: pointer;">☀️</div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 17]
            });

            const solMarker = L.marker([parseFloat(sol.lat), parseFloat(sol.lng)], { icon: solarIcon }).addTo(solarMarkerLayer);

            solMarker.bindTooltip(`
                <div style="background: rgba(28,25,23,0.92); color: #FBBF24; padding: 3px 7px; border-radius: 6px; border: 1px solid #FBBF24; font-weight: 800; font-size: 10px; text-align: center;">
                    ☀️ ${sol.name} ${sol.powerKw ? `(${sol.powerKw} kW)` : ''}
                </div>
            `, { permanent: true, direction: 'top', offset: [0, -14] });

            solMarker.bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px; min-width: 160px; padding: 2px;">
                    <strong style="display: block; color: #D97706; margin-bottom: 4px;">☀️ ${sol.name}</strong>
                    <div style="font-size: 11px; font-weight: bold; color: #1E293B; margin-bottom: 2px;">Galia: ${sol.powerKw || 7} kW</div>
                    <div style="font-size: 10px; color: #64748B; margin-bottom: 8px;">GPS: ${Number(sol.lat).toFixed(4)}, ${Number(sol.lng).toFixed(4)}</div>
                    <button type="button" class="btn-delete-map-infra" data-type="solar" data-id="${sol.id}" style="width: 100%; background: #DC2626; color: #fff; border: none; padding: 5px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
                        🗑️ Pašalinti elektrinę
                    </button>
                </div>
            `);
        });
    }
}

export function drawFieldsOnMap(fieldsList, selectedFieldId, onFieldClick) {
    cachedFieldsList = fieldsList || [];
    cachedSelectedId = selectedFieldId;
    cachedCallback = onFieldClick;

    if (!fieldsMap || !drawnItems) {
        setTimeout(() => {
            if (fieldsMap && drawnItems) renderPolygonsInternal();
        }, 250);
        return;
    }

    renderPolygonsInternal();
}

function renderPolygonsInternal() {
    if (!fieldsMap || !drawnItems) return;

    drawnItems.clearLayers();
    if (fieldLabelsLayer) fieldLabelsLayer.clearLayers();
    polygonLayersMap = {};

    cachedFieldsList.forEach(f => {
        const rawCoords = f.polygonCoordinates || [];
        if (rawCoords.length >= 3) {
            const latLngs = rawCoords.map(p => {
                if (Array.isArray(p)) return [parseFloat(p[0]), parseFloat(p[1])];
                return [parseFloat(p.lat), parseFloat(p.lng)];
            });

            const isSelected = f.id === cachedSelectedId;
            let strokeColor = isSelected ? '#FFD700' : '#00FF66';
            let strokeWidth = isSelected ? 4 : 3;

            const polygon = L.polygon(latLngs, {
                color: strokeColor,
                fill: false,
                fillOpacity: 0,
                weight: strokeWidth
            }).addTo(drawnItems);

            polygon.on('click', () => {
                if (cachedCallback) cachedCallback(f.id);
            });

            polygonLayersMap[f.id] = polygon;

            let topPoint = [latLngs[0][0], latLngs[0][1]];
            latLngs.forEach(pt => {
                if (pt[0] > topPoint[0]) topPoint = [pt[0], pt[1]];
            });

            if (fieldLabelsLayer) {
                const labelTag = L.marker(topPoint, {
                    icon: L.divIcon({
                        className: 'custom-field-label-tag',
                        html: `
                            <div style="transform: translate(-50%, -100%); margin-top: -6px; background: rgba(0,0,0,0.92); color: #fff; padding: 3px 8px; border-radius: 6px; border: 1.5px solid ${strokeColor}; font-weight: 800; font-size: 10px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.8); white-space: nowrap; cursor: pointer;">
                                <span>🌾 ${f.name}</span> • <span style="color: #4ADE80;">${f.areaHa} ha</span>
                            </div>
                        `,
                        iconSize: [0, 0]
                    })
                }).addTo(fieldLabelsLayer);

                labelTag.on('click', () => {
                    if (cachedCallback) cachedCallback(f.id);
                });
            }
        }
    });

    renderGarageMarker();
    initAndStartMapTractor();

    const hasGarage = cachedUserData?.garageLat && cachedUserData?.garageLon && cachedUserData.garageLat !== 0;
    if (!hasGarage && !hasCenteredOnGarage) {
        fitAllBounds();
        hasCenteredOnGarage = true;
    }
}

export function highlightFieldPolygon(fieldId) {
    cachedSelectedId = fieldId;
    renderPolygonsInternal();

    for (const [id, poly] of Object.entries(polygonLayersMap)) {
        if (id === fieldId) {
            poly.bringToFront();
            if (fieldsMap) fieldsMap.fitBounds(poly.getBounds(), { padding: [50, 50], maxZoom: 15 });
            break;
        }
    }
}

function fitAllBounds() {
    if (!fieldsMap) return;
    const allLayers = [];
    if (drawnItems && drawnItems.getLayers().length > 0) allLayers.push(drawnItems.getBounds());
    if (baseMarkerLayer && baseMarkerLayer.getLayers().length > 0) allLayers.push(baseMarkerLayer.getBounds());

    if (allLayers.length > 0) {
        let combinedBounds = allLayers[0];
        allLayers.forEach(b => { combinedBounds = combinedBounds.extend(b); });
        fieldsMap.fitBounds(combinedBounds, { padding: [40, 40], maxZoom: 14 });
    }
}

export function startDrawing() {
    placingInfraType = null;
    resetInfraButtonsStyle();
    drawingPoints = [];
    tempMarkers.forEach(m => fieldsMap.removeLayer(m));
    tempMarkers = [];
    if (currentDrawingPolygon) fieldsMap.removeLayer(currentDrawingPolygon);

    updateFabUi(true);
    if (fieldsMap) {
        fieldsMap.on('click', onMapClick);
        fieldsMap.getContainer().style.cursor = 'crosshair';
    }
}

export function stopDrawing() {
    if (!fieldsMap) return;
    fieldsMap.off('click', onMapClick);
    tempMarkers.forEach(m => fieldsMap.removeLayer(m));
    tempMarkers = [];
    if (currentDrawingPolygon) fieldsMap.removeLayer(currentDrawingPolygon);
    drawingPoints = [];

    updateFabUi(false);
    fieldsMap.getContainer().style.cursor = '';
}

export function drawExternalPolygon(coords) {
    if (!fieldsMap || !coords || coords.length < 3) return;
    stopDrawing();

    const latLngs = coords.map(p => [p.lat, p.lng]);
    currentDrawingPolygon = L.polygon(latLngs, { color: '#FFD700', fill: false, weight: 3.5 }).addTo(fieldsMap);
    fieldsMap.fitBounds(currentDrawingPolygon.getBounds(), { padding: [30, 30] });
}

export function getDrawingPoints() {
    return drawingPoints;
}

function onMapClick(e) {
    const latLng = e.latlng;
    drawingPoints.push(latLng);

    const marker = L.circleMarker(latLng, { color: '#00FF66', radius: 5, fillOpacity: 1 }).addTo(fieldsMap);
    tempMarkers.push(marker);

    if (currentDrawingPolygon) fieldsMap.removeLayer(currentDrawingPolygon);
    if (drawingPoints.length > 1) {
        currentDrawingPolygon = L.polygon(drawingPoints, { color: '#00FF66', fill: false, fillOpacity: 0, weight: 2.5 }).addTo(fieldsMap);
    }

    if (drawingPoints.length === 1 && typeof onFirstPointCallback === 'function') {
        onFirstPointCallback(latLng);
    }
}

export function getMockNdviScore(field) {
    const crop = (field.crop || "Kviečiai").toLowerCase();
    if (crop.includes("raps")) {
        return { score: "0.82", status: "Vešli biomasė" };
    }
    if (crop.includes("kvieč")) {
        return { score: "0.76", status: "Geras augimas" };
    }
    return { score: "0.68", status: "Optimalus augimas" };
}