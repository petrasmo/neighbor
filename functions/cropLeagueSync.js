// functions/cropLeagueSync.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function computeFieldLeagueScore(docId, f) {
  const cropLower = (f.crop || "").toLowerCase();
  const area = parseFloat(f.area || f.areaHa || 1);

  let baseNdvi = 0.65;
  if (cropLower.includes("raps")) baseNdvi = 0.74;
  else if (cropLower.includes("kvieč")) baseNdvi = 0.68;

  const score = parseFloat((baseNdvi * 100).toFixed(2));

  return {
    fieldId: docId,
    fieldName: f.block || "Didysis laukas",
    crop: f.crop || "Žieminiai kviečiai",
    region: f.region || "Vilniaus r.",
    areaHa: area,
    ndvi: baseNdvi,
    score: score,
    satDate: "09-24"
  };
}

async function executeLeagueSyncForLargeFields(db, minAreaHa = 100, res = null) {
  const log = (msg) => {
    console.log(msg);
    if (res && !res.headersSent) res.write(msg + "\n");
  };

  log(`🚀 Pradedamas didelių laukų (>= ${minAreaHa} ha) sinchronizavimas iš vietinio nma_grid aplanko...`);
  
  const LOCAL_GRID_DIR = path.join(__dirname, "nma_grid");
  if (!fs.existsSync(LOCAL_GRID_DIR)) {
    throw new Error("❌ Aplankas functions/nma_grid nerastas!");
  }

  const files = fs.readdirSync(LOCAL_GRID_DIR).filter(f => f.endsWith(".json"));
  log(`📁 Rasta vietinių tinklelio failų: ${files.length} vnt.`);

  let count = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(LOCAL_GRID_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const fields = JSON.parse(content);

      for (const f of fields) {
        const area = parseFloat(f.area) || 0;
        
        if (area >= minAreaHa) {
          const fieldId = `large_${f.block || Math.random().toString(36).substring(7)}`;
          const leagueData = computeFieldLeagueScore(fieldId, f);

          const ref = db.collection("league_scores").doc(fieldId);
          batch.set(ref, {
            ...leagueData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          count++;
          batchCount++;

          if (batchCount === 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      }
    } catch (e) {}
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  log(`✅ SĖKMĖ! Į lygą sėkmingai įrašyta ${count} laukų (>= ${minAreaHa} ha) iš vietinio aplanko.`);
  if (res && !res.headersSent) res.end();
  return count;
}

module.exports = { executeLeagueSyncForLargeFields };