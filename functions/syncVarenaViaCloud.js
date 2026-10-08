// functions/syncAllDistrictsViaCloud.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "neighborpm-b9968"
  });
}

const db = admin.firestore();
const GEE_CLOUD_FUNCTION_URL = "https://us-central1-neighborpm-b9968.cloudfunctions.net/calculate-field-ndvi-gee";

async function syncAllDistrictsViaCloud() {
  const jsonPath = path.join(__dirname, "all_districts_20_laukai.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ Nerastas failas all_districts_20_laukai.json aplanke functions/");
    return;
  }

  console.log("📂 Skaitomi visos Lietuvos rajonų laukai...");
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const fields = JSON.parse(rawData);

  console.log(`🚀 Pradedamas ${fields.length} laukų siuntimas į GEE debesies funkciją (visų rajonų lyga)...\n`);

  let updatedCount = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const block = f.block || `field_${i}`;
    const cropName = f.assignedCrop || "Žieminiai kviečiai";
    const regionName = f.region || "Lietuva";

    console.log(`⏳ [${i+1}/${fields.length}] [${regionName}] Laukas ${block} (${f.areaHa} ha, ${cropName})...`);

    try {
      const response = await axios.post(GEE_CLOUD_FUNCTION_URL, {
        coords: f.coords,
        crop: cropName
      }, { timeout: 25000 });

      const data = response.data;
      if (data && data.success) {
        const ndvi = data.ndvi;
        const score = data.score;
        const satDate = data.satDate;

        const cleanCoords = (f.coords || []).map(p => ({
          lng: parseFloat(p[0] !== undefined ? p[0] : p.lng),
          lat: parseFloat(p[1] !== undefined ? p[1] : p.lat)
        }));

        const safeRegion = regionName.replace(/[^a-zA-Z0-9]/g, '_');
        const docId = `dist_${safeRegion}_${block.replace('-', '_')}_${i}`;
        const ref = db.collection("league_scores").doc(docId);

        batch.set(ref, {
          fieldId: block,
          fieldName: `Laukas ${block}`,
          crop: cropName,
          region: regionName, // 👈 Tikrasis rajonas
          areaHa: f.areaHa,
          coords: cleanCoords,
          ndvi: ndvi,
          score: score,
          satDate: satDate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        updatedCount++;
        batchCount++;
        console.log(`   👉 NDVI=${ndvi}, Balas=${score}, Kadras=${satDate}`);

        // Firestore batch limitas yra 500, išsaugom kas 300 laukų
        if (batchCount >= 300) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
          console.log(`💾 Išsaugota pakopa į Firestore...`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Klaida laukui ${block}:`, err.message);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n🏆 SĖKMĖ! Į lygą sėkmingai įrašyta ${updatedCount} laukų visai Lietuvai su tikrais GEE kadrais!`);
  process.exit(0);
}

syncAllDistrictsViaCloud();