// functions/uploadToFirebase.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

process.env.GCLOUD_PROJECT = "neighborpm-b9968";
process.env.GOOGLE_CLOUD_PROJECT = "neighborpm-b9968";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "neighborpm-b9968"
  });
}

const db = admin.firestore();

async function uploadFieldsWithCoords() {
  const GRID_DIR = path.join(__dirname, "nma_grid");
  if (!fs.existsSync(GRID_DIR)) {
    console.error(`❌ Aplankas nerastas: ${GRID_DIR}`);
    return;
  }

  console.log("🔍 Skenuojami nma_grid failai (ieškomi laukai >= 100 ha su koordinatėmis)...");
  const files = fs.readdirSync(GRID_DIR).filter(f => f.endsWith(".json"));

  const batch = db.batch();
  let count = 0;
  const startTime = Date.now();

  for (const file of files) {
    try {
      const filePath = path.join(GRID_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const fields = JSON.parse(content);

      for (const f of fields) {
        const area = parseFloat(f.area) || 0;

        // 🌟 FILTRAS: TIK LAUKAI >= 100 HA
        if (area >= 100.0) {
          const blockStr = f.block || "Nenurodyta";
          const docId = blockStr !== "Nenurodyta" ? blockStr.replace(/[^a-zA-Z0-9-_]/g, "_") : `large_${count}`;
          
          // 🌟 PATAISYMAS: Paverčiame [lng, lat] į { lng, lat }, kad Firestore nepriekaištautų dėl nested arrays!
          const rawCoords = f.coords || [];
          const cleanCoords = rawCoords.map(p => ({
            lng: parseFloat(p[0]),
            lat: parseFloat(p[1])
          }));

          const ref = db.collection("league_scores").doc(docId);
          batch.set(ref, {
            fieldId: blockStr,
            fieldName: `Laukas ${blockStr}`,
            crop: f.crop || "Žieminiai javai",
            areaHa: area,
            coords: cleanCoords, // 👈 Švarus formatas [{lng, lat}, ...]
            score: 0,
            ndvi: 0,
            satDate: "Laukiama GEE",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          count++;
        }
      }
    } catch (e) {}
  }

  console.log(`📦 Įrašoma ${count} didžiųjų laukų į Firestore (league_scores)...`);
  await batch.commit();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 SĖKMĖ! Įrašyta ${count} laukų SU KOORDINATĖMIS per ${duration} sek.!`);
  process.exit(0);
}

uploadFieldsWithCoords();