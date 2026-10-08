// functions/sliceNma.js
const shapefile = require("shapefile");
const fs = require("fs");
const path = require("path");

// 👇 Tavo originalių Geoportalo failų kelias
const SHP_FILE = 'C:/Users/petrasmo/Desktop/NMA/Administraciniai_laukai.shp';
const DBF_FILE = 'C:/Users/petrasmo/Desktop/NMA/Administraciniai_laukai.dbf';

// Aplankas, kuriame sukris supjaustyti failiukai
const OUTPUT_DIR = path.join(__dirname, "nma_grid");

async function sliceData() {
    console.log("🚀 Pradedamas visos Lietuvos laukų pjaustymas į kvadratus...");
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }

    try {
        const source = await shapefile.open(SHP_FILE, DBF_FILE);
        let count = 0;
        let grids = {};

        // Skaitome po vieną lauką
        while (true) {
            const result = await source.read();
            if (result.done) break;
            
            const feat = result.value;
            if (!feat || !feat.geometry || !feat.geometry.coordinates) continue;

            let coords = feat.geometry.coordinates;
            // Jei MultiPolygon (laukas iš kelių dalių), imame pagrindinę
            if (feat.geometry.type === 'MultiPolygon') coords = coords[0];
            if (feat.geometry.type === 'Polygon') coords = coords[0];
            if (!coords || coords.length < 3) continue;

            // Paimame pirmą lauko tašką (ilguma ir platuma)
            const lng = coords[0][0]; // X (Ilguma, ~24.0)
            const lat = coords[0][1]; // Y (Platuma, ~55.0)

            // Pjaustome tinkleliu kas 0.1 laipsnio (tai yra ~11 km kvadratas)
            const gridLat = Math.floor(lat * 10);
            const gridLng = Math.floor(lng * 10);
            const gridKey = `grid_${gridLat}_${gridLng}`;

            if (!grids[gridKey]) grids[gridKey] = [];

            // Sumažiname koordinačių ilgį iki 5 skaičių po kablelio (1 metro tikslumas)
            const cleanCoords = coords.map(p => {
                // Konvertuojame į skaičių prieš apvalinant, kad toFixed veiktų
                const lng = parseFloat(p[0]);
                const lat = parseFloat(p[1]);
                return [
                    parseFloat(lng.toFixed(5)), 
                    parseFloat(lat.toFixed(5))
                ];
            });

            // Įrašome tik tai, ko reikia portalui (jokių perteklinių duomenų)
            grids[gridKey].push({
                block: feat.properties.KZS_NR || "",
                area: feat.properties.DKL_PLOTAS || 0,
                crop: feat.properties.GRUPE || "",
                coords: cleanCoords
            });

            count++;
            if (count % 50000 === 0) console.log(`⏳ Apdorota laukų: ${count}...`);
        }

        console.log(`\n💾 Visi laukai nuskaityti. Dabar įrašome į failiukus...`);
        
        let filesCount = 0;
        for (const [key, fields] of Object.entries(grids)) {
            const filePath = path.join(OUTPUT_DIR, `${key}.json`);
            fs.writeFileSync(filePath, JSON.stringify(fields));
            filesCount++;
        }

        console.log(`✅ SĖKMĖ! 1.1 milijono laukų supjaustyta į ${filesCount} mažų failiukų.`);
        console.log(`📁 Failai išsaugoti aplanke: ${OUTPUT_DIR}`);

    } catch (err) {
        console.error("❌ Klaida pjaustant:", err);
    }
}

sliceData();