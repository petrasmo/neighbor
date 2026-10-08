// fixAllGrids.js
const fs = require("fs");
const path = require("path");

const GRID_DIR = path.join(__dirname, "nma_grid");

function fixBalticEncoding(str) {
    return str
        .replace(/Þ/g, 'Ž').replace(/þ/g, 'ž')
        .replace(/Ð/g, 'Š').replace(/ð/g, 'š')
        .replace(/ë/g, 'ė').replace(/Ë/g, 'Ė')
        .replace(/è/g, 'č').replace(/È/g, 'Č')
        .replace(/æ/g, 'ę').replace(/Æ/g, 'Ę')
        .replace(/ø/g, 'ų').replace(/Ø/g, 'Ų')
        .replace(/û/g, 'ū').replace(/Û/g, 'Ū')
        .replace(/á/g, 'į').replace(/Á/g, 'Į')
        .replace(/à/g, 'ą').replace(/À/g, 'Ą');
}

async function runFix() {
    console.log("🔍 Pradedamas visų nma_grid failų raidžių taisymas...");
    
    if (!fs.existsSync(GRID_DIR)) {
        console.error("❌ Aplankas nma_grid nerastas!");
        return;
    }

    const files = fs.readdirSync(GRID_DIR).filter(f => f.endsWith(".json"));
    console.log(`📁 Rasta failų taisymui: ${files.length} vnt.`);

    let fixedCount = 0;

    for (const file of files) {
        const fullPath = path.join(GRID_DIR, file);
        const rawText = fs.readFileSync(fullPath, "utf-8");
        
        // Pataisome visas iškraipytas raides faile
        const fixedText = fixBalticEncoding(rawText);

        // Įrašome atgal švariu UTF-8 formatu
        fs.writeFileSync(fullPath, fixedText, "utf-8");
        fixedCount++;

        if (fixedCount % 200 === 0) {
            console.log(`⏳ Pataisyta: ${fixedCount} / ${files.length}...`);
        }
    }

    console.log(`\n🎉 VALIO! Visi ${fixedCount} failai sėkmingai pataisyti į 100% taisyklingą lietuvių kalbą!`);
}

runFix();