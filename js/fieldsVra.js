// js/fieldsVra.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';

// Standartinės normos pagal trąšų rūšį
export const FERT_PRESETS = {
    "salietra": { name: "Amonio salietra (N 34.4%)", defaultRate: 200 },
    "npk": { name: "NPK Kompleksinės (16-16-16)", defaultRate: 300 },
    "karbamidas": { name: "Karbamidas (N 46%)", defaultRate: 150 },
    "kas32": { name: "KAS-32 (Skystos trąšos)", defaultRate: 220 }
};

export function setupVraEvents(userFieldsListRef, getSelectedFieldId) {
    const vraModal = document.getElementById('vra-export-modal');
    const openBtn = document.getElementById('btn-open-vra-generator');
    const closeBtn = document.getElementById('btn-close-vra-modal');
    const fertTypeSelect = document.getElementById('vra-fert-type');
    const baseRateInput = document.getElementById('vra-base-rate');
    const downloadBtn = document.getElementById('btn-download-vra-shapefile');

    const updateVraCalculations = () => {
        const selectedFieldId = getSelectedFieldId();
        const userFieldsList = userFieldsListRef();
        const field = userFieldsList.find(f => f.id === selectedFieldId);
        const totalArea = field ? parseFloat(field.areaHa || 10) : 10;
        const base = parseFloat(baseRateInput?.value || '200');

        const weak = Math.round(base * 1.20);
        const strong = Math.round(base * 0.80);

        const weakArea = parseFloat((totalArea * 0.25).toFixed(2));
        const normalArea = parseFloat((totalArea * 0.50).toFixed(2));
        const strongArea = parseFloat((totalArea * 0.25).toFixed(2));

        const totalKg = (weakArea * weak) + (normalArea * base) + (strongArea * strong);
        const totalTons = (totalKg / 1000).toFixed(2);

        const savedKg = Math.round(strongArea * (base - strong));
        const baselineTotalKg = totalArea * base;
        const savedPercent = baselineTotalKg > 0 ? ((savedKg / baselineTotalKg) * 100).toFixed(1) : "12.5";

        document.getElementById('vra-zone-weak-rate').textContent = `${weak} kg/ha`;
        document.getElementById('vra-zone-weak-area').textContent = `~${weakArea} ha (25% ploto)`;

        document.getElementById('vra-zone-normal-rate').textContent = `${base} kg/ha`;
        document.getElementById('vra-zone-normal-area').textContent = `~${normalArea} ha (50% ploto)`;

        document.getElementById('vra-zone-strong-rate').textContent = `${strong} kg/ha`;
        document.getElementById('vra-zone-strong-area').textContent = `~${strongArea} ha (Apsauga nuo išgulimo)`;

        document.getElementById('vra-total-tons').textContent = `${totalTons} t`;
        document.getElementById('vra-saved-percent').textContent = `~${savedPercent}% (~${savedKg} kg)`;
    };

    fertTypeSelect?.addEventListener('change', (e) => {
        const preset = FERT_PRESETS[e.target.value];
        if (preset) {
            baseRateInput.value = preset.defaultRate;
            updateVraCalculations();
        }
    });

    baseRateInput?.addEventListener('input', updateVraCalculations);

    if (openBtn) {
        openBtn.onclick = () => {
            const currentFert = fertTypeSelect?.value || "salietra";
            if (FERT_PRESETS[currentFert]) {
                baseRateInput.value = FERT_PRESETS[currentFert].defaultRate;
            }

            const satDate = document.getElementById('sentinel-date-input')?.value || "2024-07-01";
            const satBadge = document.getElementById('vra-satellite-date-badge');
            const createdBadge = document.getElementById('vra-created-date-badge');
            
            if (satBadge) satBadge.textContent = satDate;
            if (createdBadge) {
                const today = new Date();
                createdBadge.textContent = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            }

            updateVraCalculations();
            vraModal.classList.remove('hidden');
        };
    }

    if (closeBtn) closeBtn.onclick = () => vraModal.classList.add('hidden');

    if (downloadBtn) {
        downloadBtn.onclick = async () => {
            const selectedFieldId = getSelectedFieldId();
            const userFieldsList = userFieldsListRef();
            const field = userFieldsList.find(f => f.id === selectedFieldId);
            if (!field) return;

            downloadBtn.disabled = true;
            downloadBtn.innerHTML = `<span>⏳</span> Generuojamas Shapefile archyvas...`;

            try {
                const fertKey = fertTypeSelect?.value || "salietra";
                const fertType = FERT_PRESETS[fertKey]?.name || "Amonio salietra";
                const baseRate = parseFloat(baseRateInput?.value || '200');
                const weakRate = Math.round(baseRate * 1.20);
                const strongRate = Math.round(baseRate * 0.80);
                const satDate = document.getElementById('sentinel-date-input')?.value || "2024-07-01";

                const coords = field.polygonCoordinates || [];
                const geoJsonCoords = coords.map(p => [p.lng, p.lat]);
                if (geoJsonCoords.length > 0) geoJsonCoords.push(geoJsonCoords[0]);

                const features = [
                    { rate: weakRate, zone: "SILPNA (+20%)", coords: geoJsonCoords },
                    { rate: baseRate, zone: "OPTIMALI", coords: geoJsonCoords },
                    { rate: strongRate, zone: "VESLI (-20%)", coords: geoJsonCoords }
                ];

                const shapefileBuffers = generateBinaryShapefilePackage(features, fertType, satDate);
                await ensureZipLibraries();

                const zip = new JSZip();
                const cleanFieldName = field.name.replace(/[^a-zA-Z0-9_-]/g, '_');
                const cleanBaseName = `VRA_${cleanFieldName}_FOTO_${satDate}_${fertKey}`;
                const folder = zip.folder(cleanBaseName);

                folder.file(`${cleanBaseName}.shp`, shapefileBuffers.shp);
                folder.file(`${cleanBaseName}.dbf`, shapefileBuffers.dbf);
                folder.file(`${cleanBaseName}.shx`, shapefileBuffers.shx);
                folder.file(`${cleanBaseName}.prj`, `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`);

                const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                const vraGeoJson = {
                    type: "FeatureCollection",
                    name: cleanBaseName,
                    satellite_imagery_date: satDate,
                    created_at: todayStr,
                    features: features.map(f => ({
                        type: "Feature",
                        properties: { RATE: f.rate, ZONE: f.zone, PRODUCT: fertType, CROP: field.crop, SAT_DATE: satDate, UNIT: "KG/HA" },
                        geometry: { type: "Polygon", coordinates: [f.coords] }
                    }))
                };
                folder.file(`${cleanBaseName}.geojson`, JSON.stringify(vraGeoJson, null, 2));

                const zipContent = await zip.generateAsync({ type: "blob" });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(zipContent);
                a.download = `${cleanBaseName}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                vraModal.classList.add('hidden');
                showDialog("VRA Archyvas paruoštas! 🚜", `Failas „${cleanBaseName}.zip“ sėkmingai atsiųstas.`, "✅");

            } catch (err) {
                console.error("VRA eksporto klaida:", err);
                showDialog("Klaida", "Nepavyko sugeneruoti Shapefile: " + err.message, "🛑");
            } finally {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = `<span class="text-xl">💾</span> <span>Atsisiųsti Shapefile Archyvą į USB (.ZIP)</span>`;
            }
        };
    }
}

function generateBinaryShapefilePackage(features, fertName, satDate) {
    let minX = 180, minY = 90, maxX = -180, maxY = -90;

    features.forEach(f => {
        f.coords.forEach(pt => {
            const x = pt[0], y = pt[1];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });
    });

    const numRecords = features.length;
    let totalShpBytes = 100;
    const recordOffsetsWords = [];

    features.forEach(f => {
        recordOffsetsWords.push(totalShpBytes / 2);
        const numPoints = f.coords.length;
        const recordContentBytes = 48 + numPoints * 16;
        totalShpBytes += 8 + recordContentBytes;
    });

    const shpBuffer = new ArrayBuffer(totalShpBytes);
    const shpView = new DataView(shpBuffer);

    shpView.setInt32(0, 9994, false);
    shpView.setInt32(24, totalShpBytes / 2, false);
    shpView.setInt32(28, 1000, true);
    shpView.setInt32(32, 5, true);
    shpView.setFloat64(36, minX, true);
    shpView.setFloat64(44, minY, true);
    shpView.setFloat64(52, maxX, true);
    shpView.setFloat64(60, maxY, true);

    let byteOffset = 100;
    features.forEach((f, idx) => {
        const numPoints = f.coords.length;
        const recordContentBytes = 48 + numPoints * 16;
        const recordContentWords = recordContentBytes / 2;

        shpView.setInt32(byteOffset, idx + 1, false);
        shpView.setInt32(byteOffset + 4, recordContentWords, false);

        const contentOffset = byteOffset + 8;
        shpView.setInt32(contentOffset, 5, true);
        shpView.setFloat64(contentOffset + 4, minX, true);
        shpView.setFloat64(contentOffset + 12, minY, true);
        shpView.setFloat64(contentOffset + 20, maxX, true);
        shpView.setFloat64(contentOffset + 28, maxY, true);
        shpView.setInt32(contentOffset + 36, 1, true);
        shpView.setInt32(contentOffset + 40, numPoints, true);
        shpView.setInt32(contentOffset + 44, 0, true);

        let ptOffset = contentOffset + 48;
        f.coords.forEach(pt => {
            shpView.setFloat64(ptOffset, pt[0], true);
            shpView.setFloat64(ptOffset + 8, pt[1], true);
            ptOffset += 16;
        });

        byteOffset += 8 + recordContentBytes;
    });

    const totalShxBytes = 100 + numRecords * 8;
    const shxBuffer = new ArrayBuffer(totalShxBytes);
    const shxView = new DataView(shxBuffer);

    shxView.setInt32(0, 9994, false);
    shxView.setInt32(24, totalShxBytes / 2, false);
    shxView.setInt32(28, 1000, true);
    shxView.setInt32(32, 5, true);
    shxView.setFloat64(36, minX, true);
    shxView.setFloat64(44, minY, true);
    shxView.setFloat64(52, maxX, true);
    shxView.setFloat64(60, maxY, true);

    features.forEach((f, idx) => {
        const numPoints = f.coords.length;
        const recordContentWords = (48 + numPoints * 16) / 2;
        shxView.setInt32(100 + idx * 8, recordOffsetsWords[idx], false);
        shxView.setInt32(104 + idx * 8, recordContentWords, false);
    });

    const headerBytes = 32 + (4 * 32) + 1;
    const recordBytes = 1 + 10 + 20 + 20 + 10;
    const totalDbfBytes = headerBytes + (numRecords * recordBytes) + 1;

    const dbfBuffer = new ArrayBuffer(totalDbfBytes);
    const dbfView = new DataView(dbfBuffer);
    const dbfBytes = new Uint8Array(dbfBuffer);

    dbfView.setUint8(0, 0x03);
    const now = new Date();
    dbfView.setUint8(1, now.getFullYear() - 1900);
    dbfView.setUint8(2, now.getMonth() + 1);
    dbfView.setUint8(3, now.getDate());
    dbfView.setUint32(4, numRecords, true);
    dbfView.setUint16(8, headerBytes, true);
    dbfView.setUint16(10, recordBytes, true);

    writeDbfField(dbfBytes, 32, "RATE", "N", 10, 0);
    writeDbfField(dbfBytes, 64, "ZONE", "C", 20, 0);
    writeDbfField(dbfBytes, 96, "PRODUCT", "C", 20, 0);
    writeDbfField(dbfBytes, 128, "SAT_DATE", "C", 10, 0);

    dbfView.setUint8(160, 0x0D);

    let recOffset = headerBytes;
    features.forEach(f => {
        dbfBytes[recOffset] = 0x20;
        writeDbfString(dbfBytes, recOffset + 1, String(f.rate).padStart(10, " "), 10);
        writeDbfString(dbfBytes, recOffset + 11, f.zone.padEnd(20, " "), 20);
        writeDbfString(dbfBytes, recOffset + 31, fertName.slice(0, 20).padEnd(20, " "), 20);
        writeDbfString(dbfBytes, recOffset + 51, (satDate || "").slice(0, 10).padEnd(10, " "), 10);
        recOffset += recordBytes;
    });

    dbfBytes[totalDbfBytes - 1] = 0x1A;

    return {
        shp: new Uint8Array(shpBuffer),
        shx: new Uint8Array(shxBuffer),
        dbf: dbfBytes
    };
}

function writeDbfField(bytes, offset, name, type, len, decimals) {
    for (let i = 0; i < 11; i++) bytes[offset + i] = 0;
    for (let i = 0; i < name.length && i < 10; i++) bytes[offset + i] = name.charCodeAt(i);
    bytes[offset + 11] = type.charCodeAt(0);
    bytes[offset + 16] = len;
    bytes[offset + 17] = decimals;
}

function writeDbfString(bytes, offset, str, maxLen) {
    for (let i = 0; i < maxLen; i++) {
        bytes[offset + i] = i < str.length ? str.charCodeAt(i) : 0x20;
    }
}

async function ensureZipLibraries() {
    if (window.JSZip) return;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Nepavyko užkrauti ZIP bibliotekos"));
        document.head.appendChild(s);
    });
}