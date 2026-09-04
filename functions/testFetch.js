// functions/testFetch.js
const axios = require("axios");

// Pagalbinė funkcija suformatuoti TradingView WebSocket žinutę
function formatTVMessage(method, params) {
  const jsonStr = JSON.stringify({ m: method, p: params });
  return `~m~${jsonStr.length}~m~${jsonStr}`;
}

// 1. Gyva kaina per TradingView Scanner (JAU VEIKIA!)
async function getLiveQuotes() {
  console.log("1. Tikrinamos gyvos kainos per Scanner...");
  const res = await axios.post("https://scanner.tradingview.com/futures/scan", {
    symbols: { tickers: ["EURONEXT:ECO1!", "EURONEXT:EBM1!", "EURONEXT:EMA1!"] },
    columns: ["close", "change", "change_abs"]
  }, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 6000
  });

  res.data.data.forEach(item => {
    console.log(`   👉 ${item.s}: ${item.d[0]} € (pokytis: ${item.d[2]} €)`);
  });
}

// 2. 1 metų istorija per tiesioginį TradingView WebSocket
function getRealHistoryViaWebSocket(ticker) {
  return new Promise((resolve, reject) => {
    console.log(`\n2. Jungiamasi prie TradingView WebSocket istorijai (${ticker})...`);
    
    // Naudojamas Node.js 22 integruotas WebSocket
    const ws = new WebSocket("wss://data.tradingview.com/socket.io/websocket", {
      headers: { "Origin": "https://www.tradingview.com" }
    });

    const sessionId = "cs_" + Math.random().toString(36).substring(2, 10);
    let resolved = false;

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        ws.close();
        reject(new Error("Laikas baigėsi (timeout)"));
      }
    }, 8000);

    ws.onopen = () => {
      // Siunčiame registraciją ir užklausą 260 dienų istorijai
      ws.send(formatTVMessage("set_auth_token", ["unauthorized_user_token"]));
      ws.send(formatTVMessage("chart_create_session", [sessionId, ""]));
      ws.send(formatTVMessage("resolve_symbol", [sessionId, "s1", `={"adjustment":"splits","symbol":"${ticker}"}`]));
      ws.send(formatTVMessage("create_series", [sessionId, "sds_1", "s1", "s1", "1D", 260, ""]));
    };

    ws.onmessage = (event) => {
      const text = event.data.toString();

      // Širdies plakimas (heartbeat)
      if (text.startsWith("~m~") && text.includes("~h~")) {
        const pingMatch = text.match(/~h~(\d+)/);
        if (pingMatch) ws.send(`~m~${pingMatch[0].length}~m~${pingMatch[0]}`);
      }

      // Tikriname, ar gavome žvakutes (timescale_update)
      if (text.includes("timescale_update")) {
        const cleanPayloads = text.split(/~m~\d+~m~/).filter(Boolean);
        for (const payload of cleanPayloads) {
          try {
            const parsed = JSON.parse(payload);
            if (parsed.m === "timescale_update" && parsed.p?.[1]?.sds_1?.s) {
              const bars = parsed.p[1].sds_1.s;
              resolved = true;
              clearTimeout(timeoutTimer);
              ws.close();

              const history = bars.map(b => {
                const [time, open, high, low, close] = b.v;
                const d = new Date(time * 1000);
                return {
                  date: d.toISOString().split("T")[0],
                  price: parseFloat(close.toFixed(2))
                };
              });

              resolve(history);
              return;
            }
          } catch (e) {
            // Ignoruojame tarpines žinutes
          }
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeoutTimer);
      reject(err);
    };
  });
}

async function startTest() {
  try {
    await getLiveQuotes();

    // Gauname Rapsų (EURONEXT:ECO1!) 260 dienų tikrą istoriją
    const rapsuIstorija = await getRealHistoryViaWebSocket("EURONEXT:ECO1!");
    console.log(`✅ SĖKMINGAI GAUTA ISTORIJA! Viso taškų: ${rapsuIstorija.length} prekybos dienų.`);
    console.log(`   👉 Seniausias taškas (prieš metus): ${rapsuIstorija[0].date} -> ${rapsuIstorija[0].price} €`);
    console.log(`   👉 Naujausias taškas (šiandien): ${rapsuIstorija[rapsuIstorija.length - 1].date} -> ${rapsuIstorija[rapsuIstorija.length - 1].price} €`);

  } catch (err) {
    console.error("❌ Klaida:", err.message);
  }
}

startTest();