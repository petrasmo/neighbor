// functions/satellitePassSync.js
const admin = require("firebase-admin");
const axios = require("axios");

// Tikrina ir registruoja kiekvieną Sentinel-2 praskridimą į Firestore
async function checkAndRegisterSatellitePass(db) {
  console.log("🛰️ Tikrinamas Sentinel-2 praskridimas virš Lietuvos...");

  try {
    const GEE_URL = "https://us-central1-neighborpm-b9968.cloudfunctions.net/calculate-field-ndvi-gee";
    
    const testPolygon = [
      { lat: 54.68, lng: 25.27 },
      { lat: 54.69, lng: 25.27 },
      { lat: 54.69, lng: 25.28 },
      { lat: 54.68, lng: 25.28 },
      { lat: 54.68, lng: 25.27 }
    ];

    const response = await axios.post(GEE_URL, { coords: testPolygon }, { timeout: 25000 });
    const data = response.data;

    if (data && data.satDate) {
      const passDate = String(data.satDate).trim(); // pvz., "10-16"
      const docId = `pass_${passDate.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      
      const passRef = db.collection("satellite_passes").doc(docId);
      const passDoc = await passRef.get();

      if (!passDoc.exists) {
        // Registruojame tik praskridimo fakto įrašą
        await passRef.set({
          passDate: passDate,
          status: "pending",
          detectedAt: admin.firestore.FieldValue.serverTimestamp(),
          description: `Sentinel-2 praskridimas užfiksuotas ${passDate}`
        });

        console.log(`✅ Užregistruotas naujas praskridimas: ${passDate}`);
        return { registered: true, passDate };
      } else {
        console.log(`ℹ️ Praskridimas ${passDate} jau buvo užregistruotas anksčiau.`);
        return { registered: false, passDate };
      }
    }
  } catch (err) {
    console.error("❌ Klaida registruojant praskridimą:", err.message);
  }

  return { registered: false };
}

module.exports = { checkAndRegisterSatellitePass };