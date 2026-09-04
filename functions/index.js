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

// 🔄 BENDRAS VISŲ DUOMENŲ ATNAUJINIMAS (KAS 6 VAL.)
async function syncAllAgroData() {
  const elevatorsCount = await executeElevatorsSync(db, admin);
  // normalus atnaujinimas: atnaujina tik šiandienos tašką
  const matifCount = await executeMatifSync(db, admin, false);
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

// 🌟 2. VIENKARTINIS 1 METŲ BIRŽOS ISTORIJOS UŽPILDYMAS (SEED)
// Šią nuorodą paspausite naršyklėje TIK VIENĄ KARTĄ, kad užsipildytų 365 dienų grafikai
exports.seedMatifHistory = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      console.log("Pradedamas vienkartinis 1 metų istorijos parsiuntimas iš biržos...");
      const count = await executeMatifSync(db, admin, true); // true = pilnas 1 m. perkrovimas
      res.send(`✅ SĖKMINGAI UŽKRAUTA 1 METŲ BIRŽOS ISTORIJA (${count} kultūros)! 📈
Kainos ir 365 dienų grafikai paruošti. Dabar kas 6 valandas sistema atnaujins tik einamosios dienos kainą.`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🚀 3. RANKINIS PALEIDIMAS: VISKAS VIENU PASPAUDIMU
exports.manualTriggerAllSync = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const stats = await syncAllAgroData();
      res.send(`✅ SĖKMINGAI ATNAUJINTA:
- 🌾 Elevatoriai: ${stats.elevators} taškai
- 📈 MATIF birža: ${stats.matif} kultūros
- ⛽ Gazolio rinka: ${stats.diesel} kuro bazės visoje Lietuvoje!`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🚀 4. RANKINIS PALEIDIMAS: TIK ELEVATORIAI
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

// 🚀 5. RANKINIS PALEIDIMAS: TIK MATIF (Einamosios dienos atnaujinimas)
exports.manualTriggerMatifScrape = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const count = await executeMatifSync(db, admin, false);
      res.send(`✅ Sėkmingai atnaujinta einamoji MATIF biržos kaina! 📈`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🚀 6. RANKINIS PALEIDIMAS: TIK GAZOLAS / DYZELINAS
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