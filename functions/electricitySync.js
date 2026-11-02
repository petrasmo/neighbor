// functions/electricitySync.js
const axios = require("axios");

/**
 * Pagalbinė funkcija: išsaugo arba papildo metų JSON failą Firebase Storage (electricity_history/YYYY.json)
 */
async function appendHoursToStorageFiles(admin, hoursList) {
  if (!hoursList || hoursList.length === 0) return;

  try {
    const bucket = admin.storage().bucket();

    // Sugrupuojame valandas pagal metus (pvz. "2025", "2026")
    const byYear = {};
    hoursList.forEach((h) => {
      if (!h.date) return;
      const yearStr = h.date.slice(0, 4);
      if (!byYear[yearStr]) byYear[yearStr] = [];
      byYear[yearStr].push(h);
    });

    for (const yearStr of Object.keys(byYear)) {
      const filePath = `electricity_history/${yearStr}.json`;
      const file = bucket.file(filePath);

      let yearData = { year: parseInt(yearStr, 10), days: {} };

      const [exists] = await file.exists();
      if (exists) {
        try {
          const [content] = await file.download();
          const parsed = JSON.parse(content.toString("utf-8"));
          if (parsed && parsed.days) {
            yearData = parsed;
          }
        } catch (readErr) {
          console.warn(`⚠️ Nepavyko nuskaityti seno ${filePath}, kuriamas naujas.`);
        }
      }

      // Įrašome dienas ir valandas kompaktišku formatu: "YYYY-MM-DD": [24 kainos ct/kWh be PVM]
      byYear[yearStr].forEach((h) => {
        const dStr = h.date;
        const hIdx = Number(h.hour);
        if (hIdx >= 0 && hIdx < 24) {
          if (!Array.isArray(yearData.days[dStr]) || yearData.days[dStr].length !== 24) {
            yearData.days[dStr] = new Array(24).fill(null);
          }
          yearData.days[dStr][hIdx] = h.priceCtNoVat;
        }
      });

      yearData.updatedAt = new Date().toISOString();

      await file.save(JSON.stringify(yearData), {
        contentType: "application/json",
        resumable: false,
        metadata: {
          cacheControl: "public, max-age=300",
        },
      });

      // Padarome failą viešai nuskaitomą naršyklei (kaip statinį JSON)
      try {
        await file.makePublic();
      } catch (e) {
        // Jei bucket'as naudoja uniform access, ignoruojame
      }

      console.log(`📁 [Storage] Failas ${filePath} sėkmingai papildytas! Dienų faile: ${Object.keys(yearData.days).length}`);
    }
  } catch (err) {
    console.error("❌ Klaida rašant Nord Pool JSON failą į Storage:", err.message);
  }
}

/**
 * Kasdienis Nord Pool sinchronizatorius (Firestore + Automatinis JSON failo papildymas)
 */
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
    hours.forEach((h) => { dateCounts[h.date] = (dateCounts[h.date] || 0) + 1; });
    const fullDates = Object.keys(dateCounts).filter((d) => dateCounts[d] >= 20).sort();

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

    // 1. Įrašome gyvas dienas į Firestore (nieko nekeičiame, kad veiktų autopilotas!)
    await db.collection("electricity_prices").doc("market_data").set(payload);

    // 2. 🌟 AUTOMATIŠKAI PAPILDOME METŲ JSON FAILĄ STORAGE!
    await appendHoursToStorageFiles(admin, hours);

    console.log(`✅ Nord Pool atnaujinta Firestore ir įrašyta į JSON failą! Valandų: ${hours.length}`);
    return payload;
  } catch (err) {
    console.error("❌ Klaida atnaujinant Nord Pool kainas:", err.message);
    return null;
  }
}

/**
 * 🌟 Vienkartinis pilnas metų (pvz. 2025 ir 2026) užkrovimas į JSON failus per Elering API
 */
async function seedFullYearElectricityToFile(admin, year) {
  console.log(`🚀 Kraunama ${year} m. Nord Pool istorija į failą electricity_history/${year}.json...`);
  const allYearHours = [];

  // Siunčiame po 2 mėnesius, kad Elering API atiduotų žaibiškai
  const chunks = [
    [`${year}-01-01T00:00:00.000Z`, `${year}-02-28T23:59:59.000Z`],
    [`${year}-03-01T00:00:00.000Z`, `${year}-04-30T23:59:59.000Z`],
    [`${year}-05-01T00:00:00.000Z`, `${year}-06-30T23:59:59.000Z`],
    [`${year}-07-01T00:00:00.000Z`, `${year}-08-31T23:59:59.000Z`],
    [`${year}-09-01T00:00:00.000Z`, `${year}-10-31T23:59:59.000Z`],
    [`${year}-11-01T00:00:00.000Z`, `${year}-12-31T23:59:59.000Z`],
  ];

  const nowTs = Math.floor(Date.now() / 1000) + 86400;

  for (const [startIso, endIso] of chunks) {
    if (new Date(startIso).getTime() / 1000 > nowTs) continue;

    try {
      const url = `https://dashboard.elering.ee/api/nps/price?start=${startIso}&end=${endIso}`;
      const res = await axios.get(url, { timeout: 15000 });
      const rawLt = res.data?.data?.lt || [];

      const hourlyBuckets = {};
      rawLt.forEach((item) => {
        const dt = new Date(item.timestamp * 1000);
        const ltDateStr = dt.toLocaleDateString("lt-LT", {
          timeZone: "Europe/Vilnius",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const hourInt = parseInt(
          dt.toLocaleTimeString("en-GB", { timeZone: "Europe/Vilnius", hour: "2-digit", hour12: false }),
          10
        );
        const key = `${ltDateStr}_${String(hourInt).padStart(2, "0")}`;
        if (!hourlyBuckets[key]) {
          hourlyBuckets[key] = { date: ltDateStr, hour: hourInt, pricesMWh: [] };
        }
        hourlyBuckets[key].pricesMWh.push(parseFloat(item.price));
      });

      Object.values(hourlyBuckets).forEach((b) => {
        const avgMWh = b.pricesMWh.reduce((a, v) => a + v, 0) / b.pricesMWh.length;
        allYearHours.push({
          date: b.date,
          hour: b.hour,
          priceCtNoVat: parseFloat((avgMWh / 10).toFixed(2)),
        });
      });
    } catch (e) {
      console.warn(`Praleistas intervalas ${startIso}:`, e.message);
    }
  }

  await appendHoursToStorageFiles(admin, allYearHours);
  return allYearHours.length;
}

module.exports = {
  executeElectricitySync,
  seedFullYearElectricityToFile,
};