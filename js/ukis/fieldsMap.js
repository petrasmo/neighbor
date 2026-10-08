// js/ukis/fieldsMap.js

const CDSE_INSTANCE_ID = "2ecdf3ed-4338-4577-a502-11dd5b2df254";
const CDSE_WMS_URL = `https://sh.dataspace.copernicus.eu/ogc/wms/${CDSE_INSTANCE_ID}`;

let fieldsMap = null;
let drawnItems = null;
let garageMarkerLayer = null;
let currentDrawingPolygon = null;
let drawingPoints = [];
let tempMarkers = [];
let polygonLayersMap = {};
let cachedFieldsList = [];
let cachedSelectedId = null;
let cachedCallback = null;
let cachedUserData = null;
let hasCenteredOnGarage = false;

// 🌟 PIRMO TAŠKO PRANEŠĖJAS
let onFirstPointCallback = null;
let isDrawingActive = false;

// Palydoviniai sluoksniai
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
		attribution: '&copy; Esri | Ⓒ NMA KPS (Geoportal.lt, 2026-09)', // 👈 PRIDĖTA NMA AUTORYSTĖ
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
    fieldsMap.addLayer(drawnItems);

    garageMarkerLayer = new L.FeatureGroup();
    fieldsMap.addLayer(garageMarkerLayer);

    addLayerSwitchControl();
    addNdviLegendControl();
    addFloatingActionControl();

    setTimeout(() => {
        if (fieldsMap) {
            fieldsMap.invalidateSize();
            renderGarageMarker();
            if (cachedFieldsList.length > 0) {
                renderPolygonsInternal();
            }
        }
    }, 150);
}

// 🌟 PLAUKIOJANTIS MYGTUKAS ŽEMĖLAPYJE [➕] -> [✓] [✕]
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
    if (garageMarkerLayer) garageMarkerLayer.bringToFront();
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
    if (!garageMarkerLayer || !fieldsMap) return;
    garageMarkerLayer.clearLayers();

    if (cachedUserData?.garageLat && cachedUserData?.garageLon && cachedUserData.garageLat !== 0) {
        const lat = parseFloat(cachedUserData.garageLat);
        const lng = parseFloat(cachedUserData.garageLon);

        const garageIcon = L.divIcon({
            className: 'custom-garage-icon',
            html: `<div style="background: #121412; border: 2.5px solid #FFD700; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">🏠</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const marker = L.marker([lat, lng], { icon: garageIcon }).addTo(garageMarkerLayer);

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
            }).addTo(drawnItems);

            labelTag.on('click', () => {
                if (cachedCallback) cachedCallback(f.id);
            });
        }
    });

    renderGarageMarker();

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
    if (garageMarkerLayer && garageMarkerLayer.getLayers().length > 0) allLayers.push(garageMarkerLayer.getBounds());

    if (allLayers.length > 0) {
        let combinedBounds = allLayers[0];
        allLayers.forEach(b => { combinedBounds = combinedBounds.extend(b); });
        fieldsMap.fitBounds(combinedBounds, { padding: [40, 40], maxZoom: 14 });
    }
}

// 🌟 BRAIŽYMO FUNKCIJOS
export function startDrawing() {
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

// 🌟 AUTOMATINIS NMA POLIGONO UŽBRAUKIMAS ŽEMĖLAPYJE
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

// 🌟 STATOMI TAŠKAI ŽEMĖLAPYJE
function onMapClick(e) {
    const latLng = e.latlng;
    drawingPoints.push(latLng);

    const marker = L.circleMarker(latLng, { color: '#00FF66', radius: 5, fillOpacity: 1 }).addTo(fieldsMap);
    tempMarkers.push(marker);

    if (currentDrawingPolygon) fieldsMap.removeLayer(currentDrawingPolygon);
    if (drawingPoints.length > 1) {
        currentDrawingPolygon = L.polygon(drawingPoints, { color: '#00FF66', fill: false, fillOpacity: 0, weight: 2.5 }).addTo(fieldsMap);
    }

    // 🌟 PIRMASIS TAŠKAS: PRANEŠAME VALDIKLIUI TIKRINTI VIETINĮ NMA TINKLELĮ!
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