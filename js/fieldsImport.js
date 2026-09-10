// js/fieldsImport.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';
import { calculatePolygonAreaHa } from './fieldsMap.js';
import { getTodayDateString } from './fieldsJournal.js';

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
                    showDialog("Tuščias failas", "Faile nerasta laukų geometrijos.", "⚠️");
                    return;
                }

                let importedCount = 0;
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

                    const areaHa = props.areaHa ? parseFloat(props.areaHa) : parseFloat(calculatePolygonAreaHa(cleanCoords));
                    const fieldName = props.name || props.PAVADINIMAS || `Laukas #${idx + 1}`;
                    const blockNumber = props.fieldBlockNumber || props.BLOKAS || props.BLOKO_NR || '';
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
                        // Naudojame string formą importui, kad išvengtume firebase namespace problemų
                        createdAt: new Date()
                    });

                    importedCount++;
                });

                await batch.commit();
                modal.classList.add('hidden');
                fileInput.value = '';
                showDialog("Sėkmingai importuota! 🌾", `Įkelta ${importedCount} laukų tiesiai į jūsų ūkį!`, "✅");

            } catch (err) {
                console.error("NMA import klaida:", err);
                showDialog("Importo klaida", "Nepavyko perskaityti GeoJSON failo. Patikrinkite formatą.", "🛑");
            }
        };
    }
}