// js/ukis/fieldsImport.js
import { db } from '../core/firebase.js';
import { showDialog, showBottomToast } from '../core/ui.js';
import { calculatePolygonAreaHa } from './fieldsMap.js';

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Taško buvimo poligone tikrinimas
function isPointInPoly(pt, vs) {
    const x = pt.lat, y = pt.lng;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].lat, yi = vs[i].lng;
        const xj = vs[j].lat, yj = vs[j].lng;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Poligono centro (centroido) apskaičiavimas
function getPolygonCenter(coords) {
    let sumLat = 0, sumLng = 0;
    coords.forEach(p => {
        sumLat += p.lat;
        sumLng += p.lng;
    });
    return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}

// Apytikslis atstumas metrais tarp dviejų GPS taškų
function getDistMeters(p1, p2) {
    const dLat = (p2.lat - p1.lat) * 111300;
    const dLng = (p2.lng - p1.lng) * 62000;
    return Math.hypot(dLat, dLng);
}

export function setupNmaImportEvents(currentUser) {
    const modal = document.getElementById('nma-import-modal');
    const openBtn = document.getElementById('btn-import-nma-modal');
    const closeBtn = document.getElementById('btn-close-nma-import');
    const triggerFileBtn = document.getElementById('btn-trigger-file-pick');
    const fileInput = document.getElementById('nma-file-hidden-input');

    if (openBtn) openBtn.onclick = () => modal.classList.remove('hidden');
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    if (triggerFileBtn && fileInput) {
        triggerFileBtn.onclick = () => fileInput.click();

        fileInput.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (!currentUser) {
                showDialog("Reikalingas prisijungimas", "Prisijunkite prie savo ūkio paskyros.", "🔒");
                return;
            }

            try {
                const text = await file.text();
                const geoJson = JSON.parse(text);
                const features = geoJson.features || (geoJson.type === 'Feature' ? [geoJson] : []);

                if (features.length === 0) {
                    showBottomToast("Faile nerasta laukų geometrijos!", "warning");
                    return;
                }

                // 1. Gauname esamus vartotojo laukus dublikatų patikrai
                const existingSnap = await db.collection("user_fields")
                    .where("userId", "==", currentUser.uid)
                    .get();

                const existingFields = [];
                existingSnap.forEach(doc => {
                    const d = doc.data();
                    if (d.polygonCoordinates && d.polygonCoordinates.length >= 3) {
                        existingFields.push({
                            id: d.id,
                            name: (d.name || "").trim().toLowerCase(),
                            block: (d.fieldBlockNumber || "").trim().toLowerCase(),
                            coords: d.polygonCoordinates,
                            center: getPolygonCenter(d.polygonCoordinates)
                        });
                    }
                });

                let importedCount = 0;
                let skippedCount = 0;
                const batch = db.batch();

                features.forEach((feat, idx) => {
                    const props = feat.properties || {};
                    const geom = feat.geometry;
                    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return;

                    let rawCoords = [];
                    if (geom.type === 'Polygon') {
                        rawCoords = geom.coordinates[0];
                    } else if (geom.type === 'MultiPolygon') {
                        rawCoords = geom.coordinates[0][0];
                    }

                    if (!rawCoords || rawCoords.length < 3) return;

                    const cleanCoords = rawCoords.map(pt => ({
                        lat: parseFloat(pt[1]),
                        lng: parseFloat(pt[0])
                    }));

                    const fieldName = props.name || props.PAVADINIMAS || `Laukas #${idx + 1}`;
                    const blockNumber = props.fieldBlockNumber || props.BLOKAS || props.BLOKO_NR || '';
                    const cleanNameLower = fieldName.trim().toLowerCase();
                    const cleanBlockLower = blockNumber.trim().toLowerCase();
                    const newCenter = getPolygonCenter(cleanCoords);

                    // 2. TIKRINAME AR LAUKAS JAU EGZISTUOJA ARBA PERSIDENGIA
                    let isDuplicate = false;

                    for (const ef of existingFields) {
                        // A: Jei sutampa tas pats bloko numeris ir pavadinimas
                        if (cleanBlockLower && ef.block && cleanBlockLower === ef.block && cleanNameLower === ef.name) {
                            isDuplicate = true;
                            break;
                        }

                        // B: Geometrinė patikra: centras yra arčiau nei 40 metrų nuo esamo lauko centro
                        const distToCenter = getDistMeters(newCenter, ef.center);
                        if (distToCenter < 40) {
                            isDuplicate = true;
                            break;
                        }

                        // C: Naujo lauko centras patenka į esamo lauko vidų
                        if (isPointInPoly(newCenter, ef.coords)) {
                            isDuplicate = true;
                            break;
                        }
                    }

                    if (isDuplicate) {
                        skippedCount++;
                        return; // Praleidžiame šį lauką, jo nebekeliame
                    }

                    // Jei laukas naujas – įtraukiame į esamų sąrašą, kad nepasidubliuotų ir pačiame importo faile
                    existingFields.push({
                        name: cleanNameLower,
                        block: cleanBlockLower,
                        coords: cleanCoords,
                        center: newCenter
                    });

                    const areaHa = props.areaHa ? parseFloat(props.areaHa) : parseFloat(calculatePolygonAreaHa(cleanCoords));
                    const crop = props.crop || props.PASELIS || 'Žieminiai kviečiai';
                    const notes = props.notes || props.PASTABOS || 'Importuota iš NMA';

                    const docRef = db.collection("user_fields").doc();
                    batch.set(docRef, {
                        id: docRef.id,
                        userId: currentUser.uid,
                        name: fieldName,
                        fieldBlockNumber: blockNumber,
                        areaHa: areaHa,
                        crop: crop,
                        notes: notes,
                        polygonCoordinates: cleanCoords,
                        operations: [
                            {
                                type: "Sėja",
                                date: getTodayDateString(),
                                product: crop,
                                rate: "NMA Deklaruotas plotas",
                                cost: 0,
                                notes: "Importuota iš NMA deklaracijos."
                            }
                        ],
                        createdAt: new Date()
                    });

                    importedCount++;
                });

                if (importedCount > 0) {
                    await batch.commit();
                }

                modal.classList.add('hidden');
                fileInput.value = '';

                if (importedCount === 0 && skippedCount > 0) {
                    showBottomToast(`Visi faile buvę laukai (${skippedCount} vnt.) jau yra jūsų ūkyje!`, "warning");
                } else if (skippedCount > 0) {
                    showBottomToast(`Įkelta ${importedCount} naujų laukų (praleista ${skippedCount} dublikatų) 🚜`);
                } else {
                    showBottomToast(`Sėkmingai importuota: įkelta ${importedCount} laukų! 🚜`);
                }

            } catch (err) {
                console.error("NMA import klaida:", err);
                showBottomToast("Nepavyko perskaityti GeoJSON failo formato!", "error");
            }
        };
    }
}