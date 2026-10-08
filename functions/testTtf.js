// functions/deleteInvalidFields.js
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "neighborpm-b9968"
  });
}

const db = admin.firestore();

async function deleteFieldsOverScore() {
  console.log("🔍 Ieškoma netinkamų laukų (kur score > 90)...");

  try {
    // Randame visus įrašus, kurių score > 90
    const snapshot = await db.collection("league_scores")
      .where("score", ">", 90)
      .get();

    if (snapshot.empty) {
      console.log("⚠️ Laukų su score > 90 nerasta.");
      process.exit(0);
    }

    console.log(`📋 Rasta trintinų laukų: ${snapshot.size} vnt.`);

    let batch = db.batch();
    let batchCount = 0;
    let deletedCount = 0;

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      deletedCount++;
      batchCount++;

      // Firestore limitas: max 500 operacijų viename batch
      if (batchCount === 400) {
        await batch.commit();
        console.log(`⏳ Ištrinta partija... Iš viso: ${deletedCount}`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n🗑️ SĖKMĖ! Iš „league_scores“ ištrinta laukų: ${deletedCount} vnt.`);
    process.exit(0);

  } catch (err) {
    console.error("❌ Klaida trinant:", err.message);
    process.exit(1);
  }
}

deleteFieldsOverScore();