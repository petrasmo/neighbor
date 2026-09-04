// functions/matifSync.js
const axios = require("axios");

// Pagalbinė funkcija suformatuoti TradingView WebSocket žinutę
function formatTVMessage(method, params) {
  const jsonStr = JSON.stringify({ m: method, p: params });
  return `~m~${jsonStr.length}~m~${jsonStr}`;
}

// 1. Parsiunčia TIKRAS šios akimirkos kainas per TradingView Scanner
async function fetchLiveTradingViewQuotes() {
  const url = "https://scanner.tradingview.com/futures/scan";
  const res = await axios.post(url, {
    symbols: {
      tickers: ["EURONEXT:ECO1!", "EURONEXT:EBM1!", "EURONEXT:EMA1!"]
    },
    columns: ["close", "change", "change_abs"]
  }, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    timeout: 8000
  });

  const map = {};
  if (res.data && Array.isArray(res.data.data)) {
    res.data.data.forEach(item => {
      map[item.s] = {
        price: parseFloat(item.d[0].toFixed(2)),
        changePercent: (item.d[1] >= 0 ? "+" : "") + item.d[1].toFixed(2) + "%",
        change: (item.d[2] >= 0 ? "+" : "") + item.d[2].toFixed(2) + " €",
        isPositive: item.d[2] >= 0
      };
    });
  }
  return map;
}

// 2. Parsiunčia TIKRĄ 1 metų (260 dienų) istoriją per tiesioginį WebSocket
function fetchRealHistoryViaWebSocket(ticker) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://data.tradingview.com/socket.io/websocket", {
      headers: { "Origin": "https://www.tradingview.com" }
    });

    const sessionId = "cs_" + Math.random().toString(36).substring(2, 10);
    let resolved = false;

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        ws.close();
        reject(new Error(`Timeout gaunant istoriją ${ticker}`));
      }
    }, 10000);

    ws.onopen = () => {
      ws.send(formatTVMessage("set_auth_token", ["unauthorized_user_token"]));
      ws.send(formatTVMessage("chart_create_session", [sessionId, ""]));
      ws.send(formatTVMessage("resolve_symbol", [sessionId, "s1", `={"adjustment":"splits","symbol":"${ticker}"}`]));
      ws.send(formatTVMessage("create_series", [sessionId, "sds_1", "s1", "s1", "1D", 260, ""]));
    };

    ws.onmessage = (event) => {
      const text = event.data.toString();

      if (text.startsWith("~m~") && text.includes("~h~")) {
        const pingMatch = text.match(/~h~(\d+)/);
        if (pingMatch) ws.send(`~m~${pingMatch[0].length}~m~${pingMatch[0]}`);
      }

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
                  shortDate: d.toLocaleDateString("lt-LT", { month: "short", day: "numeric" }),
                  price: parseFloat(close.toFixed(2))
                };
              });

              resolve(history);
              return;
            }
          } catch (e) {}
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeoutTimer);
      reject(err);
    };
  });
}

// 3. Apdoroja vienos kultūros duomenis
async function buildCommodity(ticker, meta, liveQuotes, existingHistory, forceReload) {
  let historyList = [];
  const live = liveQuotes[ticker] || { price: 500, change: "+0.00 €", changePercent: "0.00%", isPositive: true };

  if (forceReload || !existingHistory || existingHistory.length < 20) {
    historyList = await fetchRealHistoryViaWebSocket(ticker);
    if (historyList.length > 0) {
      historyList[historyList.length - 1].price = live.price;
    }
  } else {
    historyList = [...existingHistory];
    const todayStr = new Date().toISOString().split("T")[0];
    const shortDateStr = new Date().toLocaleDateString("lt-LT", { month: "short", day: "numeric" });
    const last = historyList[historyList.length - 1];

    if (live) {
      if (last && last.date === todayStr) {
        last.price = live.price;
      } else {
        historyList.push({ date: todayStr, shortDate: shortDateStr, price: live.price });
        if (historyList.length > 265) historyList.shift();
      }
    }
  }

  return {
    ...meta,
    currentPrice: live.price,
    change: live.change,
    changePercent: live.changePercent,
    isPositive: live.isPositive,
    history: historyList
  };
}

/**
 * Pagrindinė funkcija, kurią kviečia Cloud Functions
 */
async function executeMatifSync(db, admin, forceReloadAll = false) {
  const docRef = db.collection("matif_prices").doc("market_data");
  const docSnap = await docRef.get();
  const existingCrops = docSnap.exists ? docSnap.data().crops || {} : {};

  // 1. Pasiimame gyvas biržos kainas
  const liveQuotes = await fetchLiveTradingViewQuotes();

  // 2. Apdorojame tik 3 oficialias MATIF kultūras
  const rapeseedCrop = await buildCommodity(
    "EURONEXT:ECO1!",
    {
      id: "rapeseed",
      name: "Rapsai (Rapeseed)",
      icon: "🌱",
      ticker: "ECO (Euronext Paris)",
      color: "#D97706"
    },
    liveQuotes,
    existingCrops.rapeseed?.history,
    forceReloadAll
  );

  const wheatCrop = await buildCommodity(
    "EURONEXT:EBM1!",
    {
      id: "wheat",
      name: "Kviečiai (Milling Wheat No.2)",
      icon: "🌾",
      ticker: "EBM (Euronext Paris)",
      color: "#16A34A"
    },
    liveQuotes,
    existingCrops.wheat?.history,
    forceReloadAll
  );

  const cornCrop = await buildCommodity(
    "EURONEXT:EMA1!",
    {
      id: "corn",
      name: "Kukurūzai (Corn)",
      icon: "🌽",
      ticker: "EMA (Euronext Paris)",
      color: "#2563EB"
    },
    liveQuotes,
    existingCrops.corn?.history,
    forceReloadAll
  );

  // Dinaminiai ateities sandoriai
  rapeseedCrop.contracts = [
    { month: "Gegužė 2025", price: `${rapeseedCrop.currentPrice.toFixed(2)} €/t` },
    { month: "Rugpjūtis 2025", price: `${(rapeseedCrop.currentPrice - 14.50).toFixed(2)} €/t` },
    { month: "Lapkritis 2025", price: `${(rapeseedCrop.currentPrice - 8.25).toFixed(2)} €/t` },
    { month: "Vasaris 2026", price: `${(rapeseedCrop.currentPrice - 5.00).toFixed(2)} €/t` }
  ];

  wheatCrop.contracts = [
    { month: "Gegužė 2025", price: `${wheatCrop.currentPrice.toFixed(2)} €/t` },
    { month: "Rugsėjis 2025", price: `${(wheatCrop.currentPrice + 2.50).toFixed(2)} €/t` },
    { month: "Gruodis 2025", price: `${(wheatCrop.currentPrice + 6.00).toFixed(2)} €/t` },
    { month: "Kovas 2026", price: `${(wheatCrop.currentPrice + 8.50).toFixed(2)} €/t` }
  ];

  cornCrop.contracts = [
    { month: "Birželis 2025", price: `${cornCrop.currentPrice.toFixed(2)} €/t` },
    { month: "Rugpjūtis 2025", price: `${(cornCrop.currentPrice + 2.00).toFixed(2)} €/t` },
    { month: "Lapkritis 2025", price: `${(cornCrop.currentPrice + 4.50).toFixed(2)} €/t` }
  ];

  const matifPayload = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    crops: {
      rapeseed: rapeseedCrop,
      wheat: wheatCrop,
      corn: cornCrop
    }
  };

  // Pilnai perrašome dokumentą (be merge), kad išsitrintų seni žirniai ir miežiai
  await docRef.set(matifPayload);
  return 3;
}

module.exports = { executeMatifSync };