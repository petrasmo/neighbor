// functions/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Importuojame atskirus modulių sinchronizatorius
const { executeElevatorsSync } = require("./grainSync");
const { executeMatifSync } = require("./matifSync");
const { executeDieselSync } = require("./dieselSync");
const { executeFertilizerSync } = require("./fertilizerSync");

// Importuojame Išmaniųjų Pranešimų pagalbininką su veikiančiomis temomis
const { 
  checkAndSendMatifAlerts, 
  checkAndSendDieselAlerts, 
  checkAndSendNmaAlerts
} = require("./notificationsHelper");

// 🔄 BENDRAS VISŲ DUOMENŲ ATNAUJINIMAS IR PRANEŠIMŲ TIKRINIMAS
async function syncAllAgroData(isManual = false) {
  console.log("🚀 Vykdomas Agro-duomenų atnaujinimas ir pranešimų tikrinimas...");
  
  const elevatorsCount = await executeElevatorsSync(db, admin);
  const matifCount = await executeMatifSync(db, admin, false);
  const dieselDataArray = await executeDieselSync(db, admin);
  const fertilizerData = await executeFertilizerSync(db, admin);

  const vilniusHour = parseInt(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Vilnius", hour: "2-digit" }));
  console.log(`🕒 Dabartinė valanda Lietuvoje: ${vilniusHour}:00`);

  // 🌟 PRANEŠIMŲ TIKRINIMO BLOKAS:
  try {
    // 1. MATIF šuoliai (±2%) – ir 12:00, ir 18:00
    const matifDoc = await db.collection("matif_prices").doc("market_data").get();
    if (matifDoc.exists) {
      await checkAndSendMatifAlerts(db, admin, matifDoc.data().crops);
    }

    // 2. Gazolio kainų pokyčiai (±2%) – ir 12:00, ir 18:00
    if (dieselDataArray && dieselDataArray.length > 0) {
      await checkAndSendDieselAlerts(db, admin, dieselDataArray);
    }

    // 3. NMA oficialūs terminai – tik 12:00 per pietus
    if (vilniusHour < 15 || isManual) {
      await checkAndSendNmaAlerts(db, admin);
    }

  } catch (e) {
    console.error("❌ Klaida tikrinant Išmaniuosius Pranešimus (Push):", e);
  }

  return { 
    elevators: elevatorsCount, 
    matif: matifCount, 
    diesel: (dieselDataArray ? dieselDataArray.length : 0),
    fertilizerBarometer: fertilizerData?.barometer?.statusText || "OK"
  };
}

// ⏰ 1. AUTOMATINIS GRAFIKAS: KELIASI 12:00 IR 18:00 VAL. (LIETUVOS LAIKU)
exports.scrapeAllAgroData = onSchedule(
  { schedule: "0 12,18 * * *", timeZone: "Europe/Vilnius" },
  async (event) => {
    console.log("⏰ Vykdomas 12:00 / 18:00 suplanuotas visų duomenų atnaujinimas...");
    await syncAllAgroData(false);
  }
);

// 🌟 2. VIENKARTINIS 1 METŲ BIRŽOS ISTORIJOS UŽPILDYMAS (SEED)
exports.seedMatifHistory = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      console.log("Pradedamas vienkartinis 1 metų istorijos parsiuntimas iš biržos...");
      const count = await executeMatifSync(db, admin, true);
      res.send(`✅ SĖKMINGAI UŽKRAUTA 1 METŲ BIRŽOS ISTORIJA (${count} kultūros)! 📈`);
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
      const stats = await syncAllAgroData(true);
      res.send(`✅ SĖKMINGAI ĮVYKDYTAS DUOMENŲ IR PRANEŠIMŲ CIKLAS:
- 🌾 Elevatoriai: ${stats.elevators}
- 📈 MATIF birža: ${stats.matif}
- ⛽ Gazolio rinka: ${stats.diesel}
- 🧪 Trąšų barometras: ${stats.fertilizerBarometer}
- 🔔 Pranešimai patikrinti ir išsiųsti įrenginiams!`);
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

// 🚀 5. RANKINIS PALEIDIMAS: TIK MATIF
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
      const arr = await executeDieselSync(db, admin);
      res.send(`✅ Sėkmingai atnaujintos ${arr.length} Lietuvos kuro bazės! ⛽🚛`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🚀 7. TIK TRĄŠŲ RINKOS IR 5 TAISYKLIŲ BAROMETRO RANKINIS PALEIDĖJAS
exports.manualTriggerFertilizerSync = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const data = await executeFertilizerSync(db, admin);
      res.send(`✅ TRĄŠŲ RINKOS BAROMETRAS ATNAUJINTAS:
- ⚡ TTF Gamtinės dujos: ${data.gasTTF.priceMWh} €/MWh
- 💶 EUR/USD kursas: ${data.currency.rate}
- 🧪 Pasaulinis Karbamidas: ${data.ureaFOB.priceTon} $/t
- 📊 VERDIKTAS: ${data.barometer.statusText} (${data.barometer.totalScore > 0 ? '+' : ''}${data.barometer.totalScore} balai)`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🌟 8. VIENKARTINIS 1 METŲ TRĄŠŲ ISTORIJOS UŽPILDYMAS (SEED)
exports.seedFertilizerHistory = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const data = await executeFertilizerSync(db, admin);
      res.send(`✅ SĖKMINGAI UŽKRAUTA 1 METŲ TRĄŠŲ RINKOS ISTORIJA!
- TTF taškų: ${data.history.gasTTF.length} d. (${data.gasTTF.priceMWh} €/MWh)
- EUR/USD taškų: ${data.history.currency.length} d. (${data.currency.rate})
- Karbamido taškų: ${data.history.ureaFOB.length} d. (${data.ureaFOB.priceTon} $/t)`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// ========================================================
// 🔔 BANDOMIEJI TESTINIAI SIMULIATORIAI
// ========================================================

// TESTAS 1: MATIF Šuolis (+3.4%)
exports.testMatifNotification = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const testCrops = { 
        rapeseed: { name: "Rapsai (Rapeseed)", currentPrice: 514.50, change: "+17.00 €", changePercent: "+3.4%" } 
      };
      await checkAndSendMatifAlerts(db, admin, testCrops);
      res.send("✅ Testinis MATIF pranešimas sėkmingai išsiųstas į jūsų įrenginius! Patikrinkite ekraną. 📲");
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// TESTAS 2: Gazolio Atpigimas (-2.5%)
exports.testDieselNotification = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const stateRef = db.collection("system_state").doc("diesel_tracker");
      await stateRef.set({ lastAvgPrice: 0.90 });

      const mockDieselArray = [{ basePriceNoVat: 0.85 }];
      await checkAndSendDieselAlerts(db, admin, mockDieselArray);

      res.send("✅ Testinis Gazolio pranešimas išsiųstas! ⛽");
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// TESTAS 3: NMA Termino priminimas (5 d.)
exports.testNmaNotification = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 5);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      await db.collection("nma_regulations").doc("current_season").set({
        manureBanStart: "2026-11-15",
        manureBanEnd: targetDateStr,
        coverCropWinterEnd: "2026-01-15"
      }, { merge: true });

      await checkAndSendNmaAlerts(db, admin);
      res.send(`✅ Testinis NMA pranešimas išsiųstas (${targetDateStr})! 📜`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// TESTAS 4: TIESIOGINIS PRANEŠIMAS Į JŪSŲ NOTHING PHONE (2A)
exports.testPhoneNotification = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    const userPhoneToken = "drhZICOZliHlRbABJwryTJ:APA91bHGqRTOaky0UMIkyALXNDAgIC34y4DsrKK_SWokMOu2hDlNSG6Z7CfIWL8SoNjmi57DkRkzdS9wmi5UVh5IibpmoRQi-QBr4XJR1BvxgwPRDTzPwXY";

    const payload = {
      token: userPhoneToken,
      notification: {
        title: "🚜 JurgisAgro: Testas į Nothing Phone",
        body: "Valio! Pranešimai jūsų telefone veikia 100%!"
      },
      webpush: {
        notification: {
          title: "🚜 JurgisAgro: Testas į Nothing Phone",
          body: "Valio! Pranešimai jūsų telefone veikia 100%!",
          icon: "https://jurgisagro.com/logo.png",
          badge: "https://jurgisagro.com/logo.png",
          vibrate: [200, 100, 200],
          requireInteraction: false
        },
        fcmOptions: {
          link: "https://jurgisagro.com/"
        }
      }
    };

    try {
      const response = await admin.messaging().send(payload);
      res.send(`✅ SĖKMINGAI IŠSIŲSTA Į TELEFONĄ!<br>ID: ${response}`);
    } catch (err) {
      res.status(500).send(`❌ Klaida: ${err.message}`);
    }
  }
);