// uploadToFirebase.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp({
  projectId: "neighborpm-b9968"
});

const db = admin.firestore();

function computeFieldLeagueScore(f) {
  const cropLower = (f.crop || "").toLowerCase();
  const area = parseFloat(f.areaHa) || 1;

  let baseNdvi = 0.65;
  if (cropLower.includes("raps")) baseNdvi = 0.74;
  else if (cropLower.includes("kvieč")) baseNdvi = 0.68;
  else if (cropLower.includes("pup") || cropLower.includes("žirn")) baseNdvi = 0.60;

  const score = parseFloat((baseNdvi * 100).toFixed(2));

  return {
    fieldId: f.block,
    fieldName: `Laukas ${f.block}`,
    crop: f.crop || "Kviečiai",
    region: "Lietuva",
    areaHa: area,
    ndvi: baseNdvi,
    score: score,
    satDate: "09-24"
  };
}

async function uploadFieldsToFirestore() {
  const jsonPath = path.join(__dirname, "top_20ha_laukai.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ Nerastas failas top_20ha_laukai.json! Pirmiausia paleisk localSync.js");
    return;
  }

  console.log("📂 Skaitomas top_20ha_laukai.json failas...");
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const fields = JSON.parse(rawData);

  console.log(`🚀 Pradedamas ${fields.length} laukų įkėlimas į Firebase (league_scores)...`);

  let count = 0;
  let batch = db.batch();
  let batchCount = 0;
  const startTime = Date.now();

  for (const f of fields) {
    const docId = f.block !== "Nenurodyta" ? f.block.replace(/[^a-zA-Z0-9-_]/g, "_") : `field_${Math.random().toString(36).substring(7)}`;
    const leagueData = computeFieldLeagueScore(f);

    const ref = db.collection("league_scores").doc(docId);
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
      process.stdout.write(`⏳ Įkelta: ${count} / ${fields.length}...\r`);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n🎉 SĖKMĖ! Į Firebase sėkmingai įrašyta ${count} laukų per ${duration} sek.`);
  process.exit(0);
}

uploadFieldsToFirestore();