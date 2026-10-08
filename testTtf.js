// testTtf.js
const fs = require("fs");
const path = require("path");

let GRID_DIR = path.join(__dirname, "nma_grid");
if (!fs.existsSync(GRID_DIR)) {
    GRID_DIR = path.join(__dirname, "../nma_grid");
}

function analyzeLargeFields() {
    console.log("🔍 Skenuojami visi didieji Lietuvos laukai...\n");

    if (!fs.existsSync(GRID_DIR)) {
        console.error("❌ Aplankas nma_grid nerastas!");
        return;
    }

    const files = fs.readdirSync(GRID_DIR).filter(f => f.endsWith(".json"));
    
    let count40 = 0, count50 = 0, count60 = 0, count80 = 0, count100 = 0;
    let wheat50 = 0, rape50 = 0, peas50 = 0, other50 = 0;
    
    let maxArea = 0;
    let maxField = null;

    for (const file of files) {
        try {
            const raw = fs.readFileSync(path.join(GRID_DIR, file), "utf-8");
            const fields = JSON.parse(raw);

            for (const f of fields) {
                const area = parseFloat(f.area) || 0;
                
                // Ieškome pačio didžiausio Lietuvos lauko
                if (area > maxArea) {
                    maxArea = area;
                    maxField = f;
                }

                if (area >= 40) count40++;
                if (area >= 50) count50++;
                if (area >= 60) count60++;
                if (area >= 80) count80++;
                if (area >= 100) count100++;

                // Kultūrų pasiskirstymas tarp 50+ ha laukų
                if (area >= 50.0) {
                    const crop = (f.crop || "").toLowerCase();

                    if (crop.includes("javai") || crop.includes("kvieč") || crop.includes("miež") || crop.includes("rug")) {
                        wheat50++;
                    } else if (crop.includes("raps")) {
                        rape50++;
                    } else if (crop.includes("ankštin") || crop.includes("žirn") || crop.includes("pup")) {
                        peas50++;
                    } else {
                        other50++;
                    }
                }
            }
        } catch (e) {}
    }

    console.log("==================================================");
    console.log("📊 LIETUVOS DIDŽIŲJŲ LAUKŲ STATISTIKA:");
    console.log("==================================================");
    console.log(`Laukai >= 40 ha: ${count40} vnt.`);
    console.log(`⭐ Laukai >= 50 ha: ${count50} vnt. (Tavo pasirinkta riba)`);
    console.log(`Laukai >= 60 ha: ${count60} vnt.`);
    console.log(`Laukai >= 80 ha: ${count80} vnt.`);
    console.log(`Laukai >= 100 ha: ${count100} vnt. (Lietuvos gigantai)`);
    
    if (maxField) {
        console.log(`\n👑 DIDŽIAUSIAS LIETUVOS LAUKAS BAZĖJE: ${maxArea.toFixed(1)} ha!`);
        console.log(`   👉 Kultūra: ${maxField.crop} | Bloko Nr.: ${maxField.block}`);
    }

    console.log("\n--------------------------------------------------");
    console.log(`🌾 KULTŪRŲ PASISKIRSTYMAS TARP LAUKŲ >= 50 HA (${count50} vnt.):`);
    console.log("--------------------------------------------------");
    console.log(`🌾 Kviečiai / Javai: ${wheat50} laukų`);
    console.log(`🌱 Rapsai: ${rape50} laukų`);
    console.log(`🫘 Ankštiniai / Žirniai: ${peas50} laukų`);
    console.log(`⚪ Kitos kultūros / Pievos: ${other50} laukų`);
}

analyzeLargeFields();