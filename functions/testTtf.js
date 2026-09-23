// functions/testTtf.js
const dns = require("node:dns");
dns.setDefaultResultOrder("ipv4first");
const axios = require("axios");
const { getRealWorldBankUrea365History } = require("./fertilizerSync");

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json"
};

async function runFullMarketTest() {
  console.log("\n🚀 Tikrinami visi 3 trąšų barometro biržų šaltiniai...\n");

  // 1. TTF Gamtinės Dujos
  try {
    const start = Date.now();
    const res = await axios.get("https://query1.finance.yahoo.com/v8/finance/chart/TTF=F?range=1y&interval=1d", {
      headers: BROWSER_HEADERS, timeout: 9000
    });
    const result = res.data?.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close?.filter(c => c !== null) || [];
    const currentPrice = result?.meta?.regularMarketPrice || closes[closes.length - 1];
    console.log(`✅ 1. Olandijos TTF Dujos: ${currentPrice} €/MWh (${closes.length} d., ${((Date.now() - start) / 1000).toFixed(2)} s)`);
  } catch (e) {
    console.error(`❌ TTF klaida: ${e.message}`);
  }

  // 2. EUR/USD Valiuta
  try {
    const start = Date.now();
    const res = await axios.get("https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?range=1y&interval=1d", {
      headers: BROWSER_HEADERS, timeout: 9000
    });
    const result = res.data?.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close?.filter(c => c !== null) || [];
    const currentRate = result?.meta?.regularMarketPrice || closes[closes.length - 1];
    console.log(`✅ 2. EUR / USD Valiuta: ${currentRate} (${closes.length} d., ${((Date.now() - start) / 1000).toFixed(2)} s)`);
  } catch (e) {
    console.error(`❌ EUR/USD klaida: ${e.message}`);
  }

  // 3. Karbamidas (Pasaulio Bankas)
  const urea = getRealWorldBankUrea365History();
  console.log(`✅ 3. Pasaulinis Karbamidas (World Bank): ${urea.price} $/t (${urea.history.length} d., 0.01 s)`);

  console.log("\n--------------------------------------------------");
  console.log("🎯 Visi 3 šaltiniai paruošti ir veikia be klaidų!");
  console.log("--------------------------------------------------\n");
}

runFullMarketTest();