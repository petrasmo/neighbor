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

                showBottomToast("Išvalomi seni laukai ir įkeliami nauji su Lyga...");

                // ==========================================
                // 🌟 1 ŽINGSNIS: IŠTRINAME VISUS ŠIO VARTOTOJO SENUS LAUKUS
                // ==========================================
                const existingSnap = await db.collection("user_fields")
                    .where("userId", "==", currentUser.uid)
                    .get();

                // Ištriname senus laukus dalimis (kad neviršytų 500 operacijų limito)
                if (!existingSnap.empty) {
                    const deleteBatches = [];
                    let delBatch = db.batch();
                    let delCount = 0;

                    existingSnap.forEach(doc => {
                        delBatch.delete(doc.ref);
                        delCount++;
                        if (delCount === 350) {
                            deleteBatches.push(delBatch.commit());
                            delBatch = db.batch();
                            delCount = 0;
                        }
                    });
                    if (delCount > 0) deleteBatches.push(delBatch.commit());
                    await Promise.all(deleteBatches);
                }

                // ==========================================
                // 🌟 2 ŽINGSNIS: ĮRAŠOME NAUJUS LAUKUS SU inLeague = true
                // ==========================================
                const existingFields = [];
                let importedCount = 0;
                let skippedCount = 0;
                
                const writeBatches = [];
                let batch = db.batch();
                let batchCount = 0;

                for (let idx = 0; idx < features.length; idx++) {
                    const feat = features[idx];
                    const props = feat.properties || {};
                    const geom = feat.geometry;
                    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

                    let rawCoords = [];
                    if (geom.type === 'Polygon') {
                        rawCoords = geom.coordinates[0];
                    } else if (geom.type === 'MultiPolygon') {
                        rawCoords = geom.coordinates[0][0];
                    }

                    if (!rawCoords || rawCoords.length < 3) continue;

                    const cleanCoords = rawCoords.map(pt => ({
                        lat: parseFloat(pt[1]),
                        lng: parseFloat(pt[0])
                    }));

                    const fieldName = props.name || props.PAVADINIMAS || `Laukas #${idx + 1}`;
                    const blockNumber = props.fieldBlockNumber || props.BLOKAS || props.BLOKO_NR || '';
                    const cleanNameLower = fieldName.trim().toLowerCase();
                    const cleanBlockLower = blockNumber.trim().toLowerCase();
                    const newCenter = getPolygonCenter(cleanCoords);

                    // Tikriname dublikatus pačiame faile
                    let isDuplicate = false;
                    for (const ef of existingFields) {
                        if (cleanBlockLower && ef.block && cleanBlockLower === ef.block && cleanNameLower === ef.name) {
                            isDuplicate = true;
                            break;
                        }
                        const distToCenter = getDistMeters(newCenter, ef.center);
                        if (distToCenter < 40) {
                            isDuplicate = true;
                            break;
                        }
                    }

                    if (isDuplicate) {
                        skippedCount++;
                        continue;
                    }

                    existingFields.push({
                        name: cleanNameLower,
                        block: cleanBlockLower,
                        coords: cleanCoords,
                        center: newCenter
                    });

                    const areaHa = props.areaHa ? parseFloat(props.areaHa) : parseFloat(calculatePolygonAreaHa(cleanCoords));
                    const crop = props.crop || props.PASELIS || 'Žieminiai kviečiai';
                    const region = props.region || props.RAJONAS || null;
                    const notes = props.notes || props.PASTABOS || 'Importuota iš NMA';

                    const docRef = db.collection("user_fields").doc();
                    batch.set(docRef, {
                        id: docRef.id,
                        userId: currentUser.uid,
                        name: fieldName,
                        fieldBlockNumber: blockNumber,
                        areaHa: areaHa,
                        crop: crop,
                        region: region,         // 👈 Automatinis rajonas iš failo!
                        inLeague: true,         // 👈 AUTOMATIŠKAI DALYVAUJA LYGOJE!
                        notes: notes,
                        polygonCoordinates: cleanCoords,
                        operations: [
                            {
                                type: crop.includes("Arimas") ? "Žemės dirbimas" : "Sėja",
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
                    batchCount++;

                    // Saugus partijų siuntimas iki 350 įrašų
                    if (batchCount === 350) {
                        writeBatches.push(batch.commit());
                        batch = db.batch();
                        batchCount = 0;
                    }
                }

                if (batchCount > 0) {
                    writeBatches.push(batch.commit());
                }
                await Promise.all(writeBatches);

                modal.classList.add('hidden');
                fileInput.value = '';

                showBottomToast(`Sėkmingai atnaujinta: įkelta ${importedCount} laukų su aktyvia Lyga! 🏆🌾`);

            } catch (err) {
                console.error("NMA import klaida:", err);
                showBottomToast("Klaida importuojant: " + err.message, "error");
            }
        };
    }
}