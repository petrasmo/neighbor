// functions/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Importuojame atskirus modulių sinchronizatorius
const { executeElevatorsSync } = require("./grainSync");
const { executeMatifSync } = require("./matifSync");
const { executeDieselSync } = require("./dieselSync");
const { executeFertilizerSync } = require("./fertilizerSync");

// Importuojame Išmaniųjų Pranešimų pagalbininką
const { 
  checkAndSendMatifAlerts, 
  checkAndSendDieselAlerts, 
  checkAndSendNmaAlerts,
  checkAndSendFieldAndWeatherAlerts
} = require("./notificationsHelper");
const CDSE_INSTANCE_ID = "2ecdf3ed-4338-4577-a502-11dd5b2df254";
const axios = require("axios");
const { checkAndRegisterSatellitePass } = require("./satellitePassSync");

// 🔄 BENDRAS VISŲ DUOMENŲ ATNAUJINIMAS IR PRANEŠIMŲ TIKRINIMAS
async function syncAllAgroData(isManual = false) {
  console.log("🚀 Vykdomas Agro-duomenų atnaujinimas ir pranešimų tikrinimas...");
  
  const elevatorsCount = await executeElevatorsSync(db, admin);
  const matifCount = await executeMatifSync(db, admin, false);
  const dieselDataArray = await executeDieselSync(db, admin);
  const fertilizerData = await executeFertilizerSync(db, admin);

  const vilniusHour = parseInt(new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Vilnius", hour: "2-digit" }));
  console.log(`🕒 Dabartinė valanda Lietuvoje: ${vilniusHour}:00`);

  const shouldSendAlerts = isManual || vilniusHour === 12 || vilniusHour === 18;

  if (shouldSendAlerts) {
    console.log(`🔔 Vykdomas pranešimų siuntimas įrenginiams (${vilniusHour}:00)...`);
    try {
      const matifDoc = await db.collection("matif_prices").doc("market_data").get();
      if (matifDoc.exists) {
        await checkAndSendMatifAlerts(db, admin, matifDoc.data().crops);
      }

      if (dieselDataArray && dieselDataArray.length > 0) {
        await checkAndSendDieselAlerts(db, admin, dieselDataArray);
      }

      if (vilniusHour === 12 || isManual) {
        await checkAndSendNmaAlerts(db, admin);
      }

      await checkAndSendFieldAndWeatherAlerts(db, admin);

    } catch (e) {
      console.error("❌ Klaida tikrinant Išmaniuosius Pranešimus (Push):", e);
    }
  } else {
    console.log(`🌙 Tylusis atnaujinimas (${vilniusHour}:00): kainos atnaujintos, pranešimai nesiunčiami.`);
  }

  return { 
    elevators: elevatorsCount, 
    matif: matifCount, 
    diesel: (dieselDataArray ? dieselDataArray.length : 0),
    fertilizerBarometer: fertilizerData?.barometer?.statusText || "OK"
  };
}

// ⏰ 1. AUTOMATINIS GRAFIKAS: KELIASI 4 KARTUS PER PARĄ (00:00, 06:00, 12:00, 18:00)
exports.scrapeAllAgroData = onSchedule(
  { schedule: "0 0,6,12,18 * * *", timeZone: "Europe/Vilnius" },
  async (event) => {
    console.log("⏰ Vykdomas suplanuotas 4 kartų per parą duomenų atnaujinimas...");
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
// 🏆 10. ŽAIBIŠKAS PASĖLIŲ LYGOS GAVIMAS (SU RAJONO FILTRU)
// ========================================================
exports.getLeagueLeaderboard = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=60, s-maxage=120');

      const scope = req.query.scope || 'district';
      const district = req.query.district || 'Vilniaus r.';
      const currentUserId = req.query.userId || null;

      // Nuskaitome paruoštą league_scores kolekciją
      const snap = await db.collection("league_scores").get();
      const allFields = [];

      snap.forEach(doc => {
        const f = doc.data();
        const isMine = (currentUserId && f.userId === currentUserId);

        allFields.push({
          id: f.fieldId || doc.id,
          name: isMine ? f.fieldName : (f.fieldId || "XXXXXX-XXXX"),
          areaHa: f.areaHa,
          crop: f.crop || "",
          region: f.region || "Lietuva",
          satDate: f.satDate || "10-15",
          score: f.score || 0,
          userId: f.userId
        });
      });

      // 🌟 KULTŪRŲ FILTRAVIMAS IR TIKRAS RAJONINIS DERBIS:
      const filterCategory = (targetCat) => {
        let list = allFields.filter(f => {
          const c = (f.crop || "").toLowerCase();
          
          if (targetCat === 'wheat') {
            return c.includes("javai") || c.includes("kvieč") || c.includes("wheat");
          }
          if (targetCat === 'rape') {
            return c.includes("raps") || c.includes("rape");
          }
          if (targetCat === 'peas') {
            return c.includes("ankšt") || c.includes("žirn") || c.includes("pup") || c.includes("peas");
          }
          return false;
        });

        // 🌟 TIKRASIS RAJONŲ FILTRAS:
        if (scope === 'district' && district) {
          const targetClean = district.trim().toLowerCase().replace(" r.", "").replace(" sav.", "");
          
          list = list.filter(f => {
            if (!f.region) return false;
            const fieldClean = f.region.trim().toLowerCase().replace(" r.", "").replace(" sav.", "");
            return fieldClean === targetClean || fieldClean.includes(targetClean);
          });
        }

        // Rūšiuojame pagal palydovo balą (didesnis viršuje), o jei lygūs – pagal plotą
        list.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return (b.areaHa || 0) - (a.areaHa || 0);
        });

        const myPersonalRanks = [];
        list.forEach((f, idx) => {
          const rank = idx + 1;
          if (currentUserId && f.userId === currentUserId && rank > 10) {
            myPersonalRanks.push({
              rank: rank,
              name: f.name,
              areaHa: f.areaHa,
              satDate: f.satDate,
              score: f.score
            });
          }
        });

        const top10 = list.slice(0, 10).map((f, idx) => ({
          rank: idx + 1,
          name: f.name,
          areaHa: f.areaHa,
          satDate: f.satDate,
          score: f.score,
          isMine: (currentUserId && f.userId === currentUserId)
        }));

        return {
          totalCount: list.length,
          top10: top10,
          myPersonalRanks: myPersonalRanks
        };
      };

      res.json({
        wheat: filterCategory('wheat'),
        rape: filterCategory('rape'),
        peas: filterCategory('peas')
      });

    } catch (err) {
      console.error("Lygos klaida:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ========================================================
// 📱 12. TESTAS: TIESIOGINIS PRANEŠIMAS Į JŪSŲ NOTHING PHONE (2A)
// ========================================================
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

// ========================================================
// 🪄 13. AUTOMATINIS NMA KPS BLOKO IR KOORDINAČIŲ PAGAVIMAS
// ========================================================
exports.getNmaBlockInfo = onRequest(
  { cors: true, invoker: "public", region: "europe-west1" },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).send("");

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (!lat || !lng) return res.status(400).json({ error: "Nurodykite lat ir lng" });

    const gridKey = `grid_${Math.floor(lat * 10)}_${Math.floor(lng * 10)}`;

    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(`nma_grid/${gridKey}.json`);

      const [exists] = await file.exists();
      if (!exists) {
        return res.json({ success: false, message: "Šiame kvadrate NMA duomenų nėra." });
      }

      const [content] = await file.download();
      const fields = JSON.parse(content.toString("utf-8"));

      const targetPt = [lng, lat];
      
      const found = fields.find(f => {
        return f.coords && f.coords.length >= 3 && isPointInPoly(targetPt, f.coords);
      });

      if (found) {
        return res.json({
          success: true,
          blockNumber: found.block,
          areaHa: found.area,
          crop: found.crop,
          coordinates: found.coords.map(p => ({ lat: p[1], lng: p[0] }))
        });
      }

      return res.json({ success: false, message: "Šiame taške lauko nerasta." });
    } catch (err) {
      console.error("NMA Storage klaida:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// Pagalbinė ray-casting funkcija serveryje
function isPointInPoly(pt, vs) {
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0] !== undefined ? vs[i][0] : vs[i].lat;
        const yi = vs[i][1] !== undefined ? vs[i][1] : vs[i].lng;
        const xj = vs[j][0] !== undefined ? vs[j][0] : vs[j].lat;
        const yj = vs[j][1] !== undefined ? vs[j][1] : vs[j].lng;

        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// ========================================================
// 🌾 14. VIENINGO PASĖLIŲ KLASIFIKATORIAUS SUKĖLIMAS (SEED)
// ========================================================
exports.seedCropsClassifierNow = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const UNIFIED_CROPS = [
        {
          id: "wheat_winter",
          name: { lt: "Žieminiai kviečiai", en: "Winter Wheat", lv: "Ziemas kvieši" },
          icon: "🌾",
          category: "Varpiniai",
          season: "winter",
          nmaGroup: "Žieminiai javai",
          nmaCode: "ŽKV",
          inLeague: true,
          leagueCategory: "wheat",
          seedRateKgHa: 220,
          mtgGram: 45.0,
          germinationPct: 95,
          purityPct: 99,
          seedPriceTon: 420,
          defaultYieldTonHa: 6.5,
          defaultPriceTon: 225,
          fertN: 170,
          safeMoisturePct: 14.0,
          emcParams: { A: 512.4, B: 30.0, C: 0.25 },
          grainWeightMg: 45.0,
          grainsPerGram: 22.2
        },
        {
          id: "rape_winter",
          name: { lt: "Žieminiai rapsai", en: "Winter Rapeseed", lv: "Ziemas rapsis" },
          icon: "🌱",
          category: "Kryžmažiedžiai",
          season: "winter",
          nmaGroup: "Rapsai",
          nmaCode: "ŽRP",
          inLeague: true,
          leagueCategory: "rape",
          seedRateKgHa: 4.5,
          mtgGram: 4.8,
          germinationPct: 92,
          purityPct: 99,
          seedPriceTon: 1200,
          defaultYieldTonHa: 3.5,
          defaultPriceTon: 510,
          fertN: 190,
          safeMoisturePct: 9.0,
          emcParams: { A: 398.2, B: 25.0, C: 0.38 },
          grainWeightMg: 4.8,
          grainsPerGram: 208.3
        },
        {
          id: "barley_spring",
          name: { lt: "Vasariniai miežiai", en: "Spring Barley", lv: "Vasaras mieži" },
          icon: "🌾",
          category: "Varpiniai",
          season: "spring",
          nmaGroup: "Vasariniai javai",
          nmaCode: "VMŽ",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 200,
          mtgGram: 48.0,
          germinationPct: 94,
          purityPct: 99,
          seedPriceTon: 390,
          defaultYieldTonHa: 5.5,
          defaultPriceTon: 185,
          fertN: 110,
          safeMoisturePct: 14.0,
          emcParams: { A: 480.0, B: 28.0, C: 0.24 },
          grainWeightMg: 48.0,
          grainsPerGram: 20.8
        },
        {
          id: "wheat_spring",
          name: { lt: "Vasariniai kviečiai", en: "Spring Wheat", lv: "Vasaras kvieši" },
          icon: "🌾",
          category: "Varpiniai",
          season: "spring",
          nmaGroup: "Vasariniai javai",
          nmaCode: "VKV",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 230,
          mtgGram: 42.0,
          germinationPct: 95,
          purityPct: 99,
          seedPriceTon: 410,
          defaultYieldTonHa: 5.2,
          defaultPriceTon: 220,
          fertN: 140,
          safeMoisturePct: 14.0,
          emcParams: { A: 512.4, B: 30.0, C: 0.25 },
          grainWeightMg: 42.0,
          grainsPerGram: 23.8
        },
        {
          id: "oats",
          name: { lt: "Sėjamosios avižos", en: "Oats", lv: "Auzas" },
          icon: "🌾",
          category: "Varpiniai",
          season: "spring",
          nmaGroup: "Avižos",
          nmaCode: "AVŽ",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 170,
          mtgGram: 35.0,
          germinationPct: 92,
          purityPct: 98,
          seedPriceTon: 350,
          defaultYieldTonHa: 4.5,
          defaultPriceTon: 175,
          fertN: 90,
          safeMoisturePct: 14.0,
          emcParams: { A: 480.0, B: 28.0, C: 0.24 },
          grainWeightMg: 35.0,
          grainsPerGram: 28.5
        },
        {
          id: "peas_beans",
          name: { lt: "Žirniai / Pupos", en: "Peas & Beans", lv: "Zirņi un pupas" },
          icon: "🫘",
          category: "Pupiniai (Azotas)",
          season: "spring",
          nmaGroup: "Ankštiniai javai",
          nmaCode: "ŽIR",
          inLeague: true,
          leagueCategory: "peas",
          seedRateKgHa: 260,
          mtgGram: 240.0,
          germinationPct: 90,
          purityPct: 98,
          seedPriceTon: 550,
          defaultYieldTonHa: 3.8,
          defaultPriceTon: 270,
          fertN: 20,
          safeMoisturePct: 15.0,
          emcParams: { A: 450.0, B: 25.0, C: 0.23 },
          grainWeightMg: 220.0,
          grainsPerGram: 4.5
        },
        {
          id: "corn",
          name: { lt: "Kukurūzai", en: "Corn / Maize", lv: "Kukurūza" },
          icon: "🌽",
          category: "Varpiniai",
          season: "spring",
          nmaGroup: "Kukurūzai",
          nmaCode: "KUK",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 25,
          mtgGram: 300.0,
          germinationPct: 95,
          purityPct: 99,
          seedPriceTon: 2400,
          defaultYieldTonHa: 8.5,
          defaultPriceTon: 200,
          fertN: 160,
          safeMoisturePct: 14.5,
          emcParams: { A: 540.0, B: 30.0, C: 0.24 },
          grainWeightMg: 300.0,
          grainsPerGram: 3.3
        },
        {
          id: "buckwheat",
          name: { lt: "Grikiai", en: "Buckwheat", lv: "Griķi" },
          icon: "🌾",
          category: "Kita",
          season: "spring",
          nmaGroup: "Grikiai",
          nmaCode: "GRK",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 85,
          mtgGram: 28.0,
          germinationPct: 90,
          purityPct: 98,
          seedPriceTon: 600,
          defaultYieldTonHa: 1.8,
          defaultPriceTon: 380,
          fertN: 50,
          safeMoisturePct: 14.5,
          emcParams: { A: 480.0, B: 28.0, C: 0.24 },
          grainWeightMg: 28.0,
          grainsPerGram: 35.7
        },
        {
          id: "sugar_beet",
          name: { lt: "Cukriniai runkeliai", en: "Sugar Beet", lv: "Cukurbietes" },
          icon: "🌱",
          category: "Šakniavaisiai",
          season: "spring",
          nmaGroup: "Cukriniai runkeliai",
          nmaCode: "CRN",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 25,
          mtgGram: 15.0,
          germinationPct: 90,
          purityPct: 99,
          seedPriceTon: 1800,
          defaultYieldTonHa: 65.0,
          defaultPriceTon: 38,
          fertN: 140,
          safeMoisturePct: 15.0,
          emcParams: { A: 450.0, B: 25.0, C: 0.23 },
          grainWeightMg: 15.0,
          grainsPerGram: 66.7
        },
        {
          id: "fallow_black",
          name: { lt: "Nėra pasėlio (Arimas / Pūdymas)", en: "Fallow / Bare Soil", lv: "Papuve" },
          icon: "🚜",
          category: "Pūdymas",
          season: "other",
          nmaGroup: "Pūdymas",
          nmaCode: "PŪD",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 0,
          mtgGram: 0,
          germinationPct: 0,
          purityPct: 0,
          seedPriceTon: 0,
          defaultYieldTonHa: 0,
          defaultPriceTon: 0,
          fertN: 0,
          safeMoisturePct: 14.0,
          emcParams: { A: 500.0, B: 25.0, C: 0.25 },
          grainWeightMg: 0,
          grainsPerGram: 0
        },
        {
          id: "grassland",
          name: { lt: "Pievos ir ganyklos", en: "Grassland", lv: "Pļavas un ganības" },
          icon: "🍀",
          category: "Žolynai",
          season: "other",
          nmaGroup: "Ganyklos-pievos iki 5 m.",
          nmaCode: "GPA",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 25,
          mtgGram: 2.0,
          germinationPct: 85,
          purityPct: 98,
          seedPriceTon: 320,
          defaultYieldTonHa: 0,
          defaultPriceTon: 0,
          fertN: 60,
          safeMoisturePct: 14.0,
          emcParams: { A: 480.0, B: 28.0, C: 0.24 },
          grainWeightMg: 2.0,
          grainsPerGram: 500
        },
        {
          id: "other_crops",
          name: { lt: "Kita / Nenurodyta", en: "Other / Unspecified", lv: "Cits" },
          icon: "⚪",
          category: "Kita",
          season: "other",
          nmaGroup: "Kita ariama žemė",
          nmaCode: "KT",
          inLeague: false,
          leagueCategory: null,
          seedRateKgHa: 100,
          mtgGram: 30.0,
          germinationPct: 90,
          purityPct: 98,
          seedPriceTon: 400,
          defaultYieldTonHa: 3.0,
          defaultPriceTon: 200,
          fertN: 100,
          safeMoisturePct: 14.0,
          emcParams: { A: 500.0, B: 25.0, C: 0.25 },
          grainWeightMg: 30.0,
          grainsPerGram: 33.3
        }
      ];

      const batch = db.batch();
      UNIFIED_CROPS.forEach(crop => {
        const ref = db.collection("crops_classifier").doc(crop.id);
        batch.set(ref, {
          ...crop,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });

      await batch.commit();
      res.send(`✅ SĖKMINGAI ĮRAŠYTAS VIENINGAS PASĖLIŲ KLASIFIKATORIUS! Įrašyta ${UNIFIED_CROPS.length} oficialių kultūrų su NMA sąsajomis ir skaičiuoklių parametrais! 🌾`);
    } catch (err) {
      res.status(500).send("Klaida: " + err.message);
    }
  }
);

// 🚀 15. PRASKRIDIMO REGISTRAVIMAS
exports.checkAndRegisterPass = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const result = await checkAndRegisterSatellitePass(db);
      if (result && result.registered) {
        res.send(`✅ Sėkmingai užregistruotas naujas Sentinel-2 praskridimas: ${result.passDate} (statusas: pending) 🛰️`);
      } else {
        res.send(`ℹ️ Naujų užregistruotų praskridimų nerasta arba šis kadras jau buvo įrašytas.`);
      }
    } catch (err) {
      res.status(500).send("Klaida registruojant praskridimą: " + err.message);
    }
  }
);