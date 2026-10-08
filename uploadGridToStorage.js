// uploadGridToStorage.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Inicijuojame admin su tavo projekto ID
admin.initializeApp({
  projectId: "neighborpm-b9968",
  storageBucket: "neighborpm-b9968.firebasestorage.app"
});

const bucket = admin.storage().bucket();
const GRID_DIR = path.join(__dirname, "nma_grid");

async function uploadAllGrids() {
  console.log("🚀 Pradedamas nma_grid failų kėlimas į Firebase Storage...");

  if (!fs.existsSync(GRID_DIR)) {
      console.error("❌ Aplankas nma_grid nerastas!");
      return;
  }

  const files = fs.readdirSync(GRID_DIR).filter(f => f.endsWith(".json"));
  console.log(`📁 Rasta failų įkėlimui: ${files.length} vnt.\n`);

  let uploaded = 0;
  const BATCH_SIZE = 25; // Keliame partijomis po 25 failus vienu metu

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const chunk = files.slice(i, i + BATCH_SIZE);
    
    await Promise.all(chunk.map(async (file) => {
      const localFilePath = path.join(GRID_DIR, file);
      const destination = `nma_grid/${file}`;

      await bucket.upload(localFilePath, {
        destination: destination,
        metadata: {
          contentType: "application/json",
          cacheControl: "public, max-age=31536000" // Užkešuoja 1 metams greitam užkrovimui
        }
      });
    }));

    uploaded += chunk.length;
    console.log(`⏳ Įkelta: ${uploaded} / ${files.length}...`);
  }

  console.log("\n🎉 VALIO! Visi failai sėkmingai įkelti į Firebase Cloud Storage!");
}

uploadAllGrids();