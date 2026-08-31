// js/fieldsMap.js

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

let satelliteLayer = null;
let streetLayer = null;
let currentBaseLayer = 'satellite';

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

export function initOrRefreshMap(coords, userData) {
    if (userData) cachedUserData = userData;
    const mapEl = document.getElementById('fields-map');
    if (!mapEl) return;

    if (!fieldsMap) {
        fieldsMap = L.map('fields-map', { zoomControl: true }).setView([coords.lat, coords.lng], 13);

        satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri World Imagery',
            maxZoom: 18
        });

        streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map &copy; OpenStreetMap contributors',
            maxZoom: 19
        });

        satelliteLayer.addTo(fieldsMap);

        drawnItems = new L.FeatureGroup();
        fieldsMap.addLayer(drawnItems);

        garageMarkerLayer = new L.FeatureGroup();
        fieldsMap.addLayer(garageMarkerLayer);

        addLayerSwitchControl();
    }

    setTimeout(() => {
        if (fieldsMap) {
            fieldsMap.invalidateSize();
            renderGarageMarker();
            if (cachedFieldsList.length > 0) {
                renderPolygonsInternal();
            }
        }
    }, 200);
}

function addLayerSwitchControl() {
    const customControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.innerHTML = `
                <div style="background: rgba(0,0,0,0.85); padding: 4px; border-radius: 8px; border: 1px solid #333; display: flex; gap: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                    <button id="btn-map-sat" style="background: #2E7D32; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
                        🛰️ Palydovas
                    </button>
                    <button id="btn-map-street" style="background: transparent; color: #ccc; border: none; padding: 6px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
                        🗺️ Kelių planas
                    </button>
                </div>
            `;

            L.DomEvent.disableClickPropagation(container);

            setTimeout(() => {
                const btnSat = document.getElementById('btn-map-sat');
                const btnStreet = document.getElementById('btn-map-street');

                if (btnSat && btnStreet) {
                    btnSat.onclick = () => {
                        if (currentBaseLayer !== 'satellite') {
                            fieldsMap.removeLayer(streetLayer);
                            fieldsMap.addLayer(satelliteLayer);
                            currentBaseLayer = 'satellite';
                            btnSat.style.background = '#2E7D32';
                            btnSat.style.color = '#fff';
                            btnStreet.style.background = 'transparent';
                            btnStreet.style.color = '#ccc';
                        }
                    };

                    btnStreet.onclick = () => {
                        if (currentBaseLayer !== 'street') {
                            fieldsMap.removeLayer(satelliteLayer);
                            fieldsMap.addLayer(streetLayer);
                            currentBaseLayer = 'street';
                            btnStreet.style.background = '#2E7D32';
                            btnStreet.style.color = '#fff';
                            btnSat.style.background = 'transparent';
                            btnSat.style.color = '#ccc';
                        }
                    };
                }
            }, 100);

            return container;
        }
    });

    fieldsMap.addControl(new customControl());
}

// 🏠 TIKRASIS GARAŽO / ŪKIO ŽYMEKLIS
export function renderGarageMarker() {
    if (!garageMarkerLayer || !fieldsMap) return;
    garageMarkerLayer.clearLayers();

    if (cachedUserData?.garageLat && cachedUserData?.garageLon) {
        const lat = parseFloat(cachedUserData.garageLat);
        const lng = parseFloat(cachedUserData.garageLon);

        const garageIcon = L.divIcon({
            className: 'custom-garage-icon',
            html: `
                <div style="background: #121412; border: 2.5px solid #FFD700; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">
                    🏠
                </div>
            `,
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });

        const marker = L.marker([lat, lng], { icon: garageIcon }).addTo(garageMarkerLayer);

        marker.bindTooltip(`
            <div style="background: rgba(0,0,0,0.9); color: #FFD700; padding: 5px 10px; border-radius: 8px; border: 1.5px solid #FFD700; font-weight: bold; font-size: 12px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
                🚜 Mano ūkio bazė / Garažas
            </div>
        `, { permanent: true, direction: 'top', offset: [0, -15] });
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

            const polygon = L.polygon(latLngs, {
                color: isSelected ? '#FFD700' : '#00FF66',
                fillColor: isSelected ? '#4CAF50' : '#2E7D32',
                fillOpacity: isSelected ? 0.85 : 0.6,
                weight: isSelected ? 6 : 4
            }).addTo(drawnItems);

            polygon.bindTooltip(`
                <div style="background: rgba(0,0,0,0.85); color: #fff; padding: 4px 8px; border-radius: 6px; border: 1.5px solid #00FF66; font-weight: bold; font-size: 11px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                    🌾 ${f.name}<br><span style="color: #00FF66; font-weight: 800;">${f.areaHa} ha</span>
                </div>
            `, { permanent: true, direction: 'center', className: 'leaflet-tooltip-field' });

            polygon.on('click', () => {
                if (cachedCallback) cachedCallback(f.id);
            });

            polygonLayersMap[f.id] = polygon;
        }
    });

    renderGarageMarker();
    fitAllBounds();
}

export function highlightFieldPolygon(fieldId) {
    cachedSelectedId = fieldId;
    for (const [id, poly] of Object.entries(polygonLayersMap)) {
        if (id === fieldId) {
            poly.setStyle({ color: '#FFD700', fillColor: '#4CAF50', fillOpacity: 0.85, weight: 6 });
            poly.bringToFront();
            if (fieldsMap) fieldsMap.fitBounds(poly.getBounds(), { padding: [60, 60], maxZoom: 16 });
        } else {
            poly.setStyle({ color: '#00FF66', fillColor: '#2E7D32', fillOpacity: 0.6, weight: 4 });
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
        fieldsMap.fitBounds(combinedBounds, { padding: [50, 50] });
    }
}

export function startDrawing() {
    drawingPoints = [];
    tempMarkers.forEach(m => fieldsMap.removeLayer(m));
    tempMarkers = [];
    if (currentDrawingPolygon) fieldsMap.removeLayer(currentDrawingPolygon);

    fieldsMap.on('click', onMapClick);
}

export function stopDrawing() {
    if (!fieldsMap) return;
    fieldsMap.off('click', onMapClick);
    tempMarkers.forEach(m => fieldsMap.removeLayer(m));
    tempMarkers = [];
    if (currentDrawingPolygon) fieldsMap.removeLayer(currentDrawingPolygon);
    drawingPoints = [];
}

export function getDrawingPoints() {
    return drawingPoints;
}

function onMapClick(e) {
    const latLng = e.latlng;
    drawingPoints.push(latLng);

    const marker = L.circleMarker(latLng, { color: '#00FF66', radius: 6, fillOpacity: 1 }).addTo(fieldsMap);
    tempMarkers.push(marker);

    if (currentDrawingPolygon) fieldsMap.removeLayer(currentDrawingPolygon);
    if (drawingPoints.length > 1) {
        currentDrawingPolygon = L.polygon(drawingPoints, { color: '#00FF66', fillColor: '#2E7D32', fillOpacity: 0.5, weight: 3 }).addTo(fieldsMap);
    }
}