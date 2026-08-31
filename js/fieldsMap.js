// js/fieldsMap.js

let fieldsMap = null;
let drawnItems = null;
let currentDrawingPolygon = null;
let drawingPoints = [];
let tempMarkers = [];
let polygonLayersMap = {}; // fieldId -> L.polygon
let cachedFieldsList = [];
let cachedSelectedId = null;
let cachedCallback = null;

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

export function initOrRefreshMap(coords) {
    const mapEl = document.getElementById('fields-map');
    if (!mapEl) return;

    if (!fieldsMap) {
        fieldsMap = L.map('fields-map', { zoomControl: true }).setView([coords.lat, coords.lng], 13);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri World Imagery',
            maxZoom: 18
        }).addTo(fieldsMap);

        drawnItems = new L.FeatureGroup();
        fieldsMap.addLayer(drawnItems);
    }

    setTimeout(() => {
        if (fieldsMap) {
            fieldsMap.invalidateSize();
            if (cachedFieldsList.length > 0) {
                renderPolygonsInternal();
            }
        }
    }, 200);
}

export function drawFieldsOnMap(fieldsList, selectedFieldId, onFieldClick) {
    cachedFieldsList = fieldsList || [];
    cachedSelectedId = selectedFieldId;
    cachedCallback = onFieldClick;

    if (!fieldsMap || !drawnItems) {
        // Jei žemėlapis dar nesukurtas, palaukiame 250ms ir nupiešiame
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

            // 🌟 RYŠKUS NEONINIS POLIGONAS
            const polygon = L.polygon(latLngs, {
                color: isSelected ? '#FFD700' : '#00FF66',
                fillColor: isSelected ? '#4CAF50' : '#2E7D32',
                fillOpacity: isSelected ? 0.85 : 0.6,
                weight: isSelected ? 6 : 4
            }).addTo(drawnItems);

            // 🏷️ NUOLATINIS RYŠKUS ŽENKLIUKAS SU PAVADINIMU PER VIDURĮ LAUKO
            polygon.bindTooltip(`
                <div style="background: rgba(0,0,0,0.85); color: #fff; padding: 4px 8px; border-radius: 6px; border: 1.5px solid #00FF66; font-weight: bold; font-size: 11px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                    🌾 ${f.name}<br><span style="color: #00FF66; font-weight: 800;">${f.areaHa} ha</span>
                </div>
            `, { 
                permanent: true, 
                direction: 'center', 
                className: 'leaflet-tooltip-field' 
            });

            polygon.on('click', () => {
                if (cachedCallback) cachedCallback(f.id);
            });

            polygonLayersMap[f.id] = polygon;
        }
    });

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
    if (drawnItems && drawnItems.getLayers().length > 0 && fieldsMap) {
        fieldsMap.fitBounds(drawnItems.getBounds(), { padding: [50, 50] });
    }
}

// Braižymas
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