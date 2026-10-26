// syncElecLocal.js
const admin = require("firebase-admin");
const axios = require("axios");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "neighborpm-b9968"
  });
}

const db = admin.firestore();

async function testAndUploadNordPool() {
  console.log("⚡ Jungiamasi prie Elering / Nord Pool API per terminalą...");

  try {
    // Paimame realų laiką iš pasaulinio serverio (kad netrukdytų kompiuterio 2026-10-26 laikrodis)
    const headRes = await axios.get("https://dashboard.elering.ee/api/nps/price/LT/latest");
    const latestTimestamp = headRes.data?.data?.[0]?.timestamp || Math.floor(Date.now() / 1000);
    
    const baseDate = new Date(latestTimestamp * 1000);
    const start = new Date(baseDate.getTime() - 36 * 60 * 60 * 1000);
    const end = new Date(baseDate.getTime() + 36 * 60 * 60 * 1000);

    const url = `https://dashboard.elering.ee/api/nps/price?start=${start.toISOString()}&end=${end.toISOString()}`;
    console.log("📡 Siunčiama iš:", url);

    const res = await axios.get(url, { timeout: 10000 });
    const rawLt = res.data?.data?.lt || [];

    console.log(`✅ Gauta įrašų iš Nord Pool (LT): ${rawLt.length} vnt.`);

    const hourlyBuckets = {};

    rawLt.forEach((item) => {
      const dt = new Date(item.timestamp * 1000);

      const ltDateStr = dt.toLocaleDateString("lt-LT", {
        timeZone: "Europe/Vilnius",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const ltHourStr = dt.toLocaleTimeString("en-GB", {
        timeZone: "Europe/Vilnius",
        hour: "2-digit",
        hour12: false,
      });

      const hourInt = parseInt(ltHourStr, 10);
      const key = `${ltDateStr}_${String(hourInt).padStart(2, "0")}`;

      if (!hourlyBuckets[key]) {
        hourlyBuckets[key] = {
          date: ltDateStr,
          hour: hourInt,
          hourLabel: `${String(hourInt).padStart(2, "0")}:00`,
          timestamp: item.timestamp,
          pricesMWh: [],
        };
      }
      hourlyBuckets[key].pricesMWh.push(parseFloat(item.price));
    });

    const hours = Object.values(hourlyBuckets)
      .map((b) => {
        const avgMWh = b.pricesMWh.reduce((a, v) => a + v, 0) / b.pricesMWh.length;
        const priceCtNoVat = avgMWh / 10;
        const priceCtVat = priceCtNoVat * 1.21;

        return {
          date: b.date,
          hour: b.hour,
          hourLabel: b.hourLabel,
          timestamp: b.timestamp,
          priceMWh: parseFloat(avgMWh.toFixed(2)),
          priceCtNoVat: parseFloat(priceCtNoVat.toFixed(2)),
          priceCtVat: parseFloat(priceCtVat.toFixed(2)),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // Pasižiūrime kokios datos gautos
    const dates = [...new Set(hours.map(h => h.date))];
    const todayStr = dates[dates.length - 1]; // Imame naujausią pilną parą
    const todayHours = hours.filter((h) => h.date === todayStr);

    let minObj = todayHours[0];
    let maxObj = todayHours[0];
    let sum = 0;

    todayHours.forEach((h) => {
      if (h.priceCtVat < minObj.priceCtVat) minObj = h;
      if (h.priceCtVat > maxObj.priceCtVat) maxObj = h;
      sum += h.priceCtVat;
    });

    const stats = {
      minCtVat: minObj.priceCtVat,
      maxCtVat: maxObj.priceCtVat,
      avgCtVat: parseFloat((sum / todayHours.length).toFixed(2)),
      cheapestHour: minObj.hourLabel,
    };

    console.log("\n📊 ŠIANDIENOS NORD POOL LT SUVESTINĖ:");
    console.log(`   👉 Data: ${todayStr}`);
    console.log(`   🟢 Pigiausia valanda (${stats.cheapestHour}): ${stats.minCtVat} ct/kWh (su PVM)`);
    console.log(`   📊 Paros vidurkis: ${stats.avgCtVat} ct/kWh (su PVM)`);
    console.log(`   🔴 Brangiausia valanda (${maxObj.hourLabel}): ${stats.maxCtVat} ct/kWh (su PVM)`);

    // Įrašome tiesiai į tavo Firestore!
    await db.collection("electricity_prices").doc("market_data").set({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      todayDate: todayStr,
      stats: stats,
      hours: hours,
    });

    console.log("\n🎉 SĖKMĖ! Kainos įrašytos į Firebase (electricity_prices/market_data)!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Klaida:", err.message);
    process.exit(1);
  }
}

testAndUploadNordPool();