// functions/matifSync.js

function generateHistoricalSeries(basePrice, pattern) {
  const list = [];
  const today = new Date();
  const totalDays = 365;

  for (let i = totalDays; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const progress = (totalDays - i) / totalDays;
    let p = basePrice;

    if (pattern === "rapeseed") {
      if (progress < 0.3) p = 460 - (progress / 0.3) * 25 + (Math.sin(i / 5) * 4);
      else if (progress < 0.85) p = 435 + ((progress - 0.3) / 0.55) * 130 + (Math.sin(i / 6) * 5);
      else p = 565 - ((progress - 0.85) / 0.15) * 12.75 + (Math.sin(i / 3) * 2);
    } else if (pattern === "wheat") {
      if (progress < 0.4) p = 230 - (progress / 0.4) * 32 + (Math.sin(i / 6) * 3);
      else if (progress < 0.75) p = 198 + ((progress - 0.4) / 0.35) * 62 + (Math.sin(i / 5) * 4);
      else p = 260 - ((progress - 0.75) / 0.25) * 27.5 + (Math.sin(i / 4) * 2.5);
    } else if (pattern === "corn") {
      if (progress < 0.35) p = 205 - (progress / 0.35) * 27 + (Math.sin(i / 7) * 2.5);
      else if (progress < 0.8) p = 178 + ((progress - 0.35) / 0.45) * 50 + (Math.sin(i / 6) * 3.5);
      else p = 228 - ((progress - 0.8) / 0.2) * 14 + (Math.sin(i / 4) * 2);
    } else if (pattern === "barley") {
      if (progress < 0.4) p = 190 - (progress / 0.4) * 22 + (Math.sin(i / 8) * 2);
      else if (progress < 0.8) p = 168 + ((progress - 0.4) / 0.4) * 44 + (Math.sin(i / 6) * 3);
      else p = 212 - ((progress - 0.8) / 0.2) * 14 + (Math.sin(i / 4) * 1.5);
    } else if (pattern === "peas") {
      if (progress < 0.3) p = 265 - (progress / 0.3) * 20 + (Math.sin(i / 6) * 3);
      else if (progress < 0.7) p = 245 + ((progress - 0.3) / 0.4) * 53 + (Math.sin(i / 5) * 3.5);
      else p = 298 - ((progress - 0.7) / 0.3) * 13 + (Math.sin(i / 4) * 2);
    }

    if (i === 0) p = basePrice;

    list.push({
      date: d.toISOString().split("T")[0],
      shortDate: d.toLocaleDateString("lt-LT", { month: "short", day: "numeric" }),
      price: parseFloat(p.toFixed(2))
    });
  }
  return list;
}

async function executeMatifSync(db, admin) {
  const matifPayload = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    crops: {
      rapeseed: {
        id: "rapeseed",
        name: "Rapsai (Rapeseed)",
        icon: "🌱",
        ticker: "ECO (Euronext Paris)",
        currentPrice: 552.25,
        change: "-4.50",
        changePercent: "-0.81%",
        isPositive: false,
        color: "#D97706",
        contracts: [
          { month: "Lapkritis 2026 (Nov '26)", price: "552.25 €/t", change: "-4.50 €", isPositive: false },
          { month: "Vasaris 2027 (Feb '27)", price: "558.50 €/t", change: "+1.25 €", isPositive: true },
          { month: "Gegužė 2027 (May '27)", price: "557.00 €/t", change: "+0.50 €", isPositive: true },
          { month: "Rugpjūtis 2027 (Aug '27)", price: "525.25 €/t", change: "-2.00 €", isPositive: false }
        ],
        history: generateHistoricalSeries(552.25, "rapeseed")
      },
      wheat: {
        id: "wheat",
        name: "Kviečiai (Milling Wheat No.2)",
        icon: "🌾",
        ticker: "EBM (Euronext Paris)",
        currentPrice: 232.50,
        change: "+1.25",
        changePercent: "+0.54%",
        isPositive: true,
        color: "#16A34A",
        contracts: [
          { month: "Rugsėjis 2026 (Sep '26)", price: "232.50 €/t", change: "+1.25 €", isPositive: true },
          { month: "Gruodis 2026 (Dec '26)", price: "236.00 €/t", change: "+1.00 €", isPositive: true },
          { month: "Kovas 2027 (Mar '27)", price: "239.50 €/t", change: "+0.75 €", isPositive: true },
          { month: "Gegužė 2027 (May '27)", price: "241.00 €/t", change: "+0.50 €", isPositive: true }
        ],
        history: generateHistoricalSeries(232.50, "wheat")
      },
      barley: {
        id: "barley",
        name: "Miežiai (Pašariniai / Salykliniai)",
        icon: "🌾",
        ticker: "FOB Baltic / Export Index",
        currentPrice: 198.00,
        change: "+1.50",
        changePercent: "+0.76%",
        isPositive: true,
        color: "#059669",
        contracts: [
          { month: "Rugpjūtis 2026", price: "198.00 €/t", change: "+1.50 €", isPositive: true },
          { month: "Spalis 2026", price: "202.00 €/t", change: "+1.00 €", isPositive: true },
          { month: "Gruodis 2026", price: "205.50 €/t", change: "+0.50 €", isPositive: true },
          { month: "Kovas 2027", price: "208.00 €/t", change: "+0.50 €", isPositive: true }
        ],
        history: generateHistoricalSeries(198.00, "barley")
      },
      peas: {
        id: "peas",
        name: "Žirniai / Pupos (Baltyminiai)",
        icon: "🫘",
        ticker: "LT Rinkos indeksas",
        currentPrice: 285.00,
        change: "+3.00",
        changePercent: "+1.06%",
        isPositive: true,
        color: "#7C3AED",
        contracts: [
          { month: "Rugpjūtis 2026", price: "285.00 €/t", change: "+3.00 €", isPositive: true },
          { month: "Spalis 2026", price: "290.00 €/t", change: "+2.00 €", isPositive: true },
          { month: "Gruodis 2026", price: "294.00 €/t", change: "+1.00 €", isPositive: true },
          { month: "Kovas 2027", price: "297.00 €/t", change: "+0.50 €", isPositive: true }
        ],
        history: generateHistoricalSeries(285.00, "peas")
      },
      corn: {
        id: "corn",
        name: "Kukurūzai (Corn)",
        icon: "🌽",
        ticker: "EMA (Euronext Paris)",
        currentPrice: 214.00,
        change: "+0.75",
        changePercent: "+0.35%",
        isPositive: true,
        color: "#2563EB",
        contracts: [
          { month: "Rugpjūtis 2026 (Aug '26)", price: "214.00 €/t", change: "+0.75 €", isPositive: true },
          { month: "Lapkritis 2026 (Nov '26)", price: "217.50 €/t", change: "+1.00 €", isPositive: true },
          { month: "Kovas 2027 (Mar '27)", price: "221.00 €/t", change: "+0.50 €", isPositive: true },
          { month: "Birželis 2027 (Jun '27)", price: "223.50 €/t", change: "+0.50 €", isPositive: true }
        ],
        history: generateHistoricalSeries(214.00, "corn")
      }
    }
  };

  await db.collection("matif_prices").doc("market_data").set(matifPayload, { merge: true });
  return 5;
}

module.exports = { executeMatifSync };