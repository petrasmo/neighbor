// functions/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Importuojame atskirus modulius
const { executeElevatorsSync } = require("./grainSync");
const { executeMatifSync } = require("./matifSync");
const { executeDieselSync } = require("./dieselSync");

// 🔄 BENDRAS VISŲ DUOMENŲ ATNAUJINIMAS
async function syncAllAgroData() {
  const elevatorsCount = await executeElevatorsSync(db, admin);
  const matifCount = await executeMatifSync(db, admin);
  const dieselCount = await executeDieselSync(db, admin);

  return { elevators: elevatorsCount, matif: matifCount, diesel: dieselCount };
}

// ⏰ 1. AUTOMATINIS GRAFIKAS: KAS 6 VALANDAS (Atnaujina viską)
exports.scrapeAllAgroData = onSchedule(
  { schedule: "0 */6 * * *", timeZone: "Europe/Vilnius" },
  async (event) => {
    console.log("Vykdomas kas 6 valandas suplanuotas visų duomenų atnaujinimas...");
    await syncAllAgroData();
  }
);

// 🚀 2. RANKINIS PALEIDIMAS: VISKAS VIENU PASPAUDIMU
exports.manualTriggerAllSync = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const stats = await syncAllAgroData();
      res.send(`✅ SĖKMINGAI ATNAUJINTA:
- 🌾 Elevatoriai: ${stats.elevators} taškai
- 📈 MATIF birža: ${stats.matif} kultūros su 365 d. istorija
- ⛽ Gazolio rinka: ${stats.diesel} kuro bazės visoje Lietuvoje!`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🚀 3. RANKINIS PALEIDIMAS: TIK ELEVATORIAI
exports.manualTriggerGrainScrape = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const count = await executeElevatorsSync(db, admin);
      res.send(`✅ Sėkmingai atnaujinti ${count} elevatoriai! 🌾`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🚀 4. RANKINIS PALEIDIMAS: TIK MATIF BIRŽA
exports.manualTriggerMatifScrape = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const count = await executeMatifSync(db, admin);
      res.send(`✅ Sėkmingai atnaujintos ${count} MATIF biržos kultūros! 📈`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🚀 5. RANKINIS PALEIDIMAS: TIK GAZOLAS / DYZELINAS
exports.manualTriggerDieselScrape = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const count = await executeDieselSync(db, admin);
      res.send(`✅ Sėkmingai atnaujintos ${count} Lietuvos kuro bazės! ⛽🚛`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);