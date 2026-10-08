// localSync.js
const fs = require("fs");
const path = require("path");

function runLocalAnalysis20Ha() {
    console.log("🔍 Pradedamas nma_grid skenavimas laukams (>= 20 ha)...\n");
    
    const LOCAL_GRID_DIR = path.join(__dirname, "functions", "nma_grid");
    
    if (!fs.existsSync(LOCAL_GRID_DIR)) {
        console.error(`❌ Aplankas nerastas adresu: ${LOCAL_GRID_DIR}`);
        return;
    }

    const files = fs.readdirSync(LOCAL_GRID_DIR).filter(f => f.endsWith(".json"));
    console.log(`📁 Rasta tinklelio failų: ${files.length} vnt.`);

    let allFields = [];
    const startTime = Date.now();

    for (const file of files) {
        try {
            const filePath = path.join(LOCAL_GRID_DIR, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const fields = JSON.parse(content);

            for (const f of fields) {
                const area = parseFloat(f.area) || 0;
                
                // 🌟 NUSTATYTA RIBA NUO 20 HA
                if (area >= 20.0) {
                    allFields.push({
                        gridFile: file, // 👈 Failo vardas, iš kurio paimta
                        block: f.block || "Nenurodyta",
                        crop: f.crop || "Kviečiai", // Paimama tiesiai iš tavo sutvarkytų failų
                        areaHa: area,
                        coordsCount: (f.coords || []).length
                    });
                }
            }
        } catch (e) {}
    }

    // Surūšiuojame nuo didžiausio iki mažiausio
    allFields.sort((a, b) => b.areaHa - a.areaHa);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("==================================================");
    console.log(`👑 RASTI LAUKAI (>= 20 HA): ${allFields.length} vnt.`);
    console.log(`⏱️ Užtruko laiko: ${duration} sek.`);
    console.log("==================================================");
    
    // Parodome pirmus 10
    allFields.slice(0, 10).forEach((f, idx) => {
        console.log(`${idx + 1}. Failas: ${f.gridFile} | Bloko Nr.: ${f.block} | Plotas: ${f.areaHa} ha | Kultūra: ${f.crop}`);
    });

    // Išsaugome į failą
    const outputFile = path.join(__dirname, "top_20ha_laukai.json");
    fs.writeFileSync(outputFile, JSON.stringify(allFields, null, 2), "utf-8");
    
    const stats = fs.statSync(outputFile);
    const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`\n💾 Rezultatai sėkmingai išsaugoti faile: top_20ha_laukai.json (${fileSizeMb} MB)`);
}

runLocalAnalysis20Ha();