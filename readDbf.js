const shapefile = require("shapefile");

async function testReadDBF() {
    // Tavo failo kelias
    const FILE_PATH = 'C:/Users/petrasmo/Desktop/NMA/Administraciniai_laukai.dbf';

    console.log("🔍 Atidaromas oficialus Geoportal DBF failas (su Shapefile biblioteka)...");

    try {
        // Atidarome tik DBF dalį (be geometrijos, kad būtų greita)
        const source = await shapefile.openDbf(FILE_PATH);
        
        console.log(`✅ Failas sėkmingai atidarytas!`);
        
        console.log("\n------------------------------------------------");
        console.log("🌾 SKAITOME PIRMUS 10 LAUKŲ:");
        console.log("------------------------------------------------");

        // Skaitome po vieną įrašą
        for (let i = 0; i < 10; i++) {
            const result = await source.read();
            if (result.done) break; // Jei failas baigėsi greičiau
            
            console.log(`\nLaukas #${i + 1}:`);
            console.log(result.value);
        }

    } catch (err) {
        console.error("❌ Klaida skaitant failą:", err.message);
    }
}

testReadDBF();