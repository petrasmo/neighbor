// exportFields20Ha.js
const fs = require("fs");
const path = require("path");

const GRID_DIR = path.join(__dirname, "nma_grid");
const OUTPUT_FILE = path.join(__dirname, "visi_laukai_20ha.geojson");

function exportLargeFields() {
    console.log("🔍 Skenuojami nma_grid failai ir ieškomi laukai >= 20 ha...\n");

    if (!fs.existsSync(GRID_DIR)) {
        console.error("❌ Aplankas nma_grid nerastas!");
        return;
    }

    const files = fs.readdirSync(GRID_DIR).filter(f => f.endsWith(".json"));
    console.log(`📁 Rasta tinklelio failų: ${files.length} vnt.`);

    let features = [];
    let count20Ha = 0;

    for (const file of files) {
        try {
            const raw = fs.readFileSync(path.join(GRID_DIR, file), "utf-8");
            const fields = JSON.parse(raw);

            for (const f of fields) {
                const area = parseFloat(f.area) || 0;

                // 🌟 ATSIRENKAME TIK LAUKUS >= 20 HA
                if (area >= 20.0) {
                    const rawCoords = f.coords || [];
                    if (rawCoords.length < 3) continue;

                    // GeoJSON formatas reikalauja [ilguma, platuma]
                    const ring = rawCoords.map(p => [parseFloat(p[0]), parseFloat(p[1])]);
                    
                    // Uždarome poligoną, jei paskutinis taškas nesutampa su pirmu
                    const first = ring[0];
                    const last = ring[ring.length - 1];
                    if (first[0] !== last[0] || first[1] !== last[1]) {
                        ring.push([first[0], first[1]]);
                    }

                    features.push({
                        type: "Feature",
                        properties: {
                            id: f.block || `field_${count20Ha}`,
                            block: f.block || "",
                            crop: f.crop || "Kviečiai",
                            areaHa: area
                        },
                        geometry: {
                            type: "Polygon",
                            coordinates: [ring]
                        }
                    });

                    count20Ha++;
                }
            }
        } catch (e) {
            // Ignoruojame sugadintus failus
        }
    }

    const geoJsonCollection = {
        type: "FeatureCollection",
        name: "Lietuvos_Laukai_20Ha",
        features: features
    };

    console.log(`\n💾 Rasta ir apdorota laukų >= 20 ha: ${count20Ha} vnt.`);
    console.log(`📦 Rašomas GeoJSON failas į: ${OUTPUT_FILE}...`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geoJsonCollection), "utf-8");

    console.log(`\n✅ 1 ŽINGSNIS BAIGTAS! Failas „visi_laukai_20ha.geojson“ sėkmingai sugeneruotas.`);
    console.log(`👉 Dabar šį failą galėsim įkelti į Google Earth Engine!`);
}

exportLargeFields();