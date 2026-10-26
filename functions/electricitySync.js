// functions/electricitySync.js
const axios = require("axios");

async function executeElectricitySync(db, admin) {
  console.log("⚡ Vykdomas Nord Pool (LT) elektros kainų atnaujinimas...");

  try {
    const headRes = await axios.get("https://dashboard.elering.ee/api/nps/price/LT/latest", { timeout: 8000 });
    const latestTimestamp = headRes.data?.data?.[0]?.timestamp || Math.floor(Date.now() / 1000);
    
    const baseDate = new Date(latestTimestamp * 1000);
    const start = new Date(baseDate.getTime() - 48 * 60 * 60 * 1000);
    const end = new Date(baseDate.getTime() + 36 * 60 * 60 * 1000);

    const url = `https://dashboard.elering.ee/api/nps/price?start=${start.toISOString()}&end=${end.toISOString()}`;
    const res = await axios.get(url, { timeout: 10000 });

    const rawLt = res.data?.data?.lt || [];
    if (rawLt.length === 0) {
      throw new Error("Elering API negrąžino LT zonos duomenų.");
    }

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

    const dateCounts = {};
    hours.forEach(h => { dateCounts[h.date] = (dateCounts[h.date] || 0) + 1; });
    const fullDates = Object.keys(dateCounts).filter(d => dateCounts[d] >= 20).sort();

    // Jei turime ir šiandienos, ir rytojaus pilnas paras, pagrindinė diena yra šiandien
    const realTodayLt = new Date().toLocaleDateString("lt-LT", {
      timeZone: "Europe/Vilnius",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const todayStr = fullDates.includes(realTodayLt)
      ? realTodayLt
      : fullDates[0];

    const todayHours = hours.filter((h) => h.date === todayStr);

    let stats = { minCtVat: 0, maxCtVat: 0, avgCtVat: 0, cheapestHour: "00:00" };

    if (todayHours.length > 0) {
      let minObj = todayHours[0];
      let maxObj = todayHours[0];
      let sum = 0;

      todayHours.forEach((h) => {
        if (h.priceCtVat < minObj.priceCtVat) minObj = h;
        if (h.priceCtVat > maxObj.priceCtVat) maxObj = h;
        sum += h.priceCtVat;
      });

      stats = {
        minCtVat: minObj.priceCtVat,
        maxCtVat: maxObj.priceCtVat,
        avgCtVat: parseFloat((sum / todayHours.length).toFixed(2)),
        cheapestHour: minObj.hourLabel,
      };
    }

    const payload = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      todayDate: todayStr,
      stats: stats,
      hours: hours,
    };

    await db.collection("electricity_prices").doc("market_data").set(payload);
    console.log(`✅ Nord Pool atnaujinta! Įrašyta valandų: ${hours.length}`);
    return payload;
  } catch (err) {
    console.error("❌ Klaida atnaujinant Nord Pool kainas:", err.message);
    return null;
  }
}

module.exports = { executeElectricitySync };