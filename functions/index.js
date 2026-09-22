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

// Importuojame Išmaniųjų Pranešimų pagalbininką su visomis temomis
const { 
  checkAndSendMatifAlerts, 
  checkAndSendDieselAlerts, 
  checkAndSendNmaAlerts,
  checkAndSendFieldAndWeatherAlerts
} = require("./notificationsHelper");

// 🔄 BENDRAS VISŲ DUOMENŲ ATNAUJINIMAS IR PRANEŠIMŲ TIKRINIMAS
async function syncAllAgroData(isManual = false) {
  console.log("🚀 Vykdomas Agro-duomenų atnaujinimas ir pranešimų tikrinimas...");
  
  const elevatorsCount = await executeElevatorsSync(db, admin);
  const matifCount = await executeMatifSync(db, admin, false);
  const dieselDataArray = await executeDieselSync(db, admin);

  // Nustatome, kokia dabar valanda Lietuvoje (12 ar 18)
  const vilniusHour = parseInt(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Vilnius", hour: "2-digit" }));
  console.log(`🕒 Dabartinė valanda Lietuvoje: ${vilniusHour}:00`);

  // 🌟 PRANEŠIMŲ TIKRINIMO BLOKAS:
  try {
    // 1. Tikriname MATIF šuolius (±2%) – ir 12:00, ir 18:00
    const matifDoc = await db.collection("matif_prices").doc("market_data").get();
    if (matifDoc.exists) {
      await checkAndSendMatifAlerts(db, admin, matifDoc.data().crops);
    }

    // 2. Tikriname Gazolio kainų pokyčius (±2%) – ir 12:00, ir 18:00
    if (dieselDataArray && dieselDataArray.length > 0) {
      await checkAndSendDieselAlerts(db, admin, dieselDataArray);
    }

    // 3. NMA oficialūs 7 terminai – tikrinami TIK 12:00 per pietus (kad nesidubliuotų vakare)
    if (vilniusHour < 15 || isManual) {
      await checkAndSendNmaAlerts(db, admin);
    }

    // 4. Kruša, Žiemkenčių šaltis ir naktiniai pavojai – tikrinami TIK 18:00 vakare prieš naktį!
    if (vilniusHour >= 16 || isManual) {
      console.log("🌙 Vakarinis patikrinimas: analizuojamas nakties šaltis ir grėsmės...");
      await checkAndSendFieldAndWeatherAlerts(db, admin);
    }

  } catch (e) {
    console.error("❌ Klaida tikrinant Išmaniuosius Pranešimus (Push):", e);
  }

  return { elevators: elevatorsCount, matif: matifCount, diesel: (dieselDataArray ? dieselDataArray.length : 0) };
}

// ⏰ 1. AUTOMATINIS GRAFIKAS: KELIASI TIK 12:00 IR 18:00 VAL. (LIETUVOS LAIKU)
exports.scrapeAllAgroData = onSchedule(
  { schedule: "0 12,18 * * *", timeZone: "Europe/Vilnius" },
  async (event) => {
    console.log("⏰ Vykdomas 12:00 / 18:00 suplanuotas visų duomenų atnaujinimas ir pranešimų siuntimas...");
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
      res.send(`✅ SĖKMINGAI UŽKRAUTA 1 METŲ BIRŽOS ISTORIJA (${count} kultūros)! 📈
Kainos ir 365 dienų grafikai paruošti. Dabar sistema atnaujins tik einamosios dienos kainą.`);
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
      res.send(`✅ SĖKMINGAI ATNAUJINTA:
- 🌾 Elevatoriai: ${stats.elevators} taškai
- 📈 MATIF birža: ${stats.matif} kultūros
- ⛽ Gazolio rinka: ${stats.diesel} kuro bazės visoje Lietuvoje!
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

// ========================================================
// 🔔 BANDOMIEJI TESTINIAI SIMULIATORIAI (VISI 7 TESTAI)
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

      res.send("✅ Testinis Gazolio pranešimas išsiųstas! (Jei turite Nustatymuose varnelę) ⛽");
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// TESTAS 3: NMA Termino priminimas (Simuliuojame, kad po 5 d. baigiasi draudimas)
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
      res.send(`✅ Testinis NMA pranešimas išsiųstas (Mėšlo draudimo pabaiga ${targetDateStr})! 📜`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// TESTAS 4: Krušos pavojus (Simuliacija)
exports.testHailNotification = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const usersSnap = await db.collection("users").get();
      for (const doc of usersSnap.docs) {
        const user = doc.data();
        const tokens = user.fcmTokens || (user.fcmToken ? [user.fcmToken] : []);
        if (tokens.length > 0 && user.notificationPreferences?.hailWarning) {
          await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            data: { 
              title: "🧊 KRUŠOS PAVOJUS!", 
              body: "Rytoj ties jūsų ūkio baze prognozuojama kruša. Apsaugokite techniką ir automobilius!" 
            }
          });
        }
      }
      res.send("✅ Testinis Krušos pranešimas išsiųstas! 🧊");
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// TESTAS 5: Žiemkenčių plikšalis / iššalimas (Simuliacija)
exports.testWinterDangerNotification = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const usersSnap = await db.collection("users").get();
      for (const doc of usersSnap.docs) {
        const user = doc.data();
        const tokens = user.fcmTokens || (user.fcmToken ? [user.fcmToken] : []);
        if (tokens.length > 0 && user.notificationPreferences?.winterDanger) {
          await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            data: { 
              title: "🚨 Kritinis iššalimas: Laukas prie miško", 
              body: "Augimo mazge temperatūra pasiekė -9.5°C! Sniego danga per plona, gresia pasėlių žūtis." 
            }
          });
        }
      }
      res.send("✅ Testinis Žiemkenčių pavojaus pranešimas išsiųstas! ❄️");
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// TESTAS 6: Pavasario T-Sum startas (Simuliacija)
exports.testTsumNotification = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const usersSnap = await db.collection("users").get();
      for (const doc of usersSnap.docs) {
        const user = doc.data();
        const tokens = user.fcmTokens || (user.fcmToken ? [user.fcmToken] : []);
        if (tokens.length > 0 && user.notificationPreferences?.tSumStart) {
          await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            data: { 
              title: "🌱 Pavasario N1 startas: Paežeriai", 
              body: "Sukaupta 195°C šilumos suma. Kviečių šaknys nubudo – laikas pirmajam salietros tręšimui!" 
            }
          });
        }
      }
      res.send("✅ Testinis T-Sum vegetacijos starto pranešimas išsiųstas! 🌱");
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// TESTAS 7: Sentinel-2 palydovo kadras (Simuliacija)
exports.testSatNotification = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const usersSnap = await db.collection("users").get();
      for (const doc of usersSnap.docs) {
        const user = doc.data();
        const tokens = user.fcmTokens || (user.fcmToken ? [user.fcmToken] : []);
        if (tokens.length > 0 && user.notificationPreferences?.satPass) {
          await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            data: { 
              title: "🛰️ Naujas palydovo kadras: Didysis laukas", 
              body: "Virš jūsų laukų ką tik praskrido Sentinel-2! Šviežia NDVI biomasės analizė jau paruošta." 
            }
          });
        }
      }
      res.send("✅ Testinis Palydovo pranešimas išsiųstas! 🛰️");
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);