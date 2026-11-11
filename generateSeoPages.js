// generateSeoPages.js
const fs = require("fs");
const path = require("path");

const BASE_HTML_PATH = path.join(__dirname, "index.html");
const EN_DIR = path.join(__dirname, "en");
let baseHtml = fs.readFileSync(BASE_HTML_PATH, "utf-8");

// Užtikriname, kad css/style.min.css ir js/main.js turėtų šakninį '/' priekyje, jog veiktų ir iš /en/ aplanko!
baseHtml = baseHtml
  .replace(/href="css\/style\.min\.css"/g, 'href="/css/style.min.css"')
  .replace(/src="js\/main\.js/g, 'src="/js/main.js');

if (!fs.existsSync(EN_DIR)) {
  fs.mkdirSync(EN_DIR, { recursive: true });
}

const SEO_PAGES = [
  // SKAIČIUOKLĖS
  {
    slug: "nordpool-kainos",
    priority: "0.9",
    freq: "hourly",
    lt: {
      title: "Nord Pool Elektros Kainos Pavalandžiui Lietuvoje | JurgisAgro",
      h1: "⚡ Nord Pool Elektros Kainos Pavalandžiui (Šiandien ir Rytoj)",
      desc: "Gyvos Nord Pool elektros biržos kainos šiandien ir rytoj pavalandžiui Lietuvoje. Sužinokite pigiausias valandas grūdų bokštų ventiliavimui ir šilumos siurbliams."
    },
    en: {
      title: "Nord Pool Electricity Prices Hourly (Live Today & Tomorrow) | JurgisAgro",
      h1: "⚡ Live Nord Pool Hourly Electricity Prices (Today & Tomorrow)",
      desc: "Live Nord Pool hourly electricity spot prices for today and tomorrow. Find the cheapest hours for grain bin aeration fans, heat pumps, and farm equipment."
    }
  },
  {
    slug: "matif-birza",
    priority: "0.9",
    freq: "hourly",
    lt: {
      title: "Euronext MATIF Paryžiaus Grūdų ir Rapsų Birža Gyvai | JurgisAgro",
      h1: "📈 Euronext MATIF Grūdų, Kviečių ir Rapsų Biržos Kainos Gyvai",
      desc: "Tiesioginės Euronext MATIF (Paryžiaus biržos) kviečių, rapsų ir kukurūzų kainos, ateities sandoriai (futures) ir 1 metų grafikai realiu laiku."
    },
    en: {
      title: "Euronext MATIF Grain, Wheat & Rapeseed Live Prices | JurgisAgro",
      h1: "📈 Live Euronext MATIF Paris Milling Wheat, Rapeseed & Corn Prices",
      desc: "Real-time Euronext MATIF Paris grain exchange quotes, futures contracts, daily changes, and interactive 1-year price charts for wheat, rapeseed, and corn."
    }
  },
  {
    slug: "grain-supirkimas",
    priority: "0.9",
    freq: "hourly",
    lt: {
      title: "Lietuvos Elevatorių Grūdų Supirkimo Kainos ir Logistika | JurgisAgro",
      h1: "🌾 Grūdų Supirkimo Kainos Lietuvos Elevatoriuose ir Skaičiuoklė",
      desc: "Kur labiausiai apsimoka vežti derlių: 45 Lietuvos elevatorių (Linas Agro, Scandagra, Agrokoncertas, Kauno Grūdai) kainų palyginimas, džiovinimo nuoskaitos ir transportas."
    },
    en: {
      title: "Grain Elevator Buying Prices, Drying & Logistics Calculator | JurgisAgro",
      h1: "🌾 Grain Elevator Buying Prices, Moisture Deduction & Transport Calculator",
      desc: "Compare live grain elevator buying prices for wheat, rapeseed, barley, and peas. Calculate moisture and impurity deductions, drying fees, and transport costs per ton-km."
    }
  },
  {
    slug: "dyzelinas-gazolas",
    priority: "0.9",
    freq: "daily",
    lt: {
      title: "Žymėto Dyzelino (Gazolio) Kaina ir 52 Kuro Bazės | JurgisAgro",
      h1: "⛽ Žymėto Dyzelino (Gazolio) Užsakymas ir Didmeninės Kainos",
      desc: "Didmeninė žymėto dyzelino (gazolio) kaina ūkininkams iš 52 Lietuvos kuro bazių pagal oficialią AB ORLEN Lietuva didmenos bazę su pristatymu į ūkį."
    },
    en: {
      title: "Wholesale Agricultural Diesel (Red Diesel) Price Calculator | JurgisAgro",
      h1: "⛽ Wholesale Agricultural Marked Diesel Prices & Fuel Depots",
      desc: "Live ORLEN wholesale agricultural diesel benchmark prices, excise duty calculations, and GPS distance ranking across 52 regional fuel depots."
    }
  },
  {
    slug: "grudu-sandelis",
    priority: "0.8",
    freq: "daily",
    lt: {
      title: "Grūdų Sandėlis, Bokštų Ventiliavimas (EMC) ir Ekonomika | JurgisAgro",
      h1: "🌾 Grūdų Sandėliavimo Ekonomika ir Bokštų Ventiliavimas (EMC)",
      desc: "Parduoti ar laikyti grūdus? Saugojimo savikainos skaičiuoklė bei protingas bokštų ventiliavimas pagal ASABE Chung-Pfost EMC drėgmės formulę."
    },
    en: {
      title: "Grain Storage Economics & Bin Aeration EMC Calculator | JurgisAgro",
      h1: "🌾 Grain Storage ROI & Smart Bin Aeration (ASABE Chung-Pfost EMC)",
      desc: "Sell now or store grain? Calculate grain storage breakeven price, shrinkage, and safe 48-hour bin fan aeration windows using the ASABE Chung-Pfost Equilibrium Moisture Content (EMC) model."
    }
  },
  {
    slug: "nma-terminai",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "NMA Terminai, Draudimai ir GAAB Reikalavimai | JurgisAgro",
      h1: "📜 NMA Teisinių Terminų, Mėšlo ir Posėlių Draudimų Šviesoforas",
      desc: "Oficialūs NMA ir LR ŽŪM terminai: mėšlo ir srutų skleidimo draudimai, tarpinių pasėlių išlaikymo datos ir sankcijų prevencija ūkininkams."
    },
    en: {
      title: "EU CAP & GAEC Agricultural Compliance Deadlines | JurgisAgro",
      h1: "📜 EU CAP, GAEC & Environmental Compliance Deadlines Traffic Light",
      desc: "Track mandatory EU Common Agricultural Policy (CAP) deadlines, manure spreading bans, winter cover crop retention dates, and buffer strip regulations."
    }
  },
  {
    slug: "sejos-norma",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "Tiksli Sėjos Normos (MTG) Skaičiuoklė Ūkiui | JurgisAgro",
      h1: "🌱 Tiksli Sėjos Normos (kg/ha) ir MTG Skaičiuoklė",
      desc: "Apskaičiuokite tikslų kg/ha sėklų poreikį kviečiams, rapsams, miežiams ir žirniams pagal 1000 grūdų masę (MTG), daigumą ir švarumą."
    },
    en: {
      title: "Precision Seeding Rate & TGW Calculator (kg/ha) | JurgisAgro",
      h1: "🌱 Precision Seeding Rate (kg/ha) & Thousand Grain Weight (TGW) Calculator",
      desc: "Calculate exact seeding rates in kg/ha, total seed tonnage, 500kg big-bags, and seed costs per hectare based on Thousand Grain Weight (TGW), germination, and purity."
    }
  },
  {
    slug: "tarpiniai-paseliai",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "Tarpinių Pasėlių (Posėlių) Mišinių Skaičiuoklė | JurgisAgro",
      h1: "🌿 Tarpinių Pasėlių (Posėlių) Mišinių ir NMA Ekoschemų Skaičiuoklė",
      desc: "Sudarykite NMA ekoschemas atitinkančius 2–5 augalų tarpinių pasėlių (garstyčių, ridikų, avižų, vikių, facelijų) mišinius ir sužinokite tikslų svorį maišymui."
    },
    en: {
      title: "Cover Crop Mix & Eco-Scheme Seed Calculator | JurgisAgro",
      h1: "🌿 Multi-Species Cover Crop Mix & EU Eco-Scheme Calculator",
      desc: "Design compliant 2 to 5 species cover crop mixtures (mustard, oilseed radish, oats, vetch, phacelia, clover) and calculate exact mixing weights and costs per hectare."
    }
  },
  {
    slug: "kombaino-nuostoliai",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "Kombaino Kūlimo Nuostolių Skaičiuoklė | JurgisAgro",
      h1: "🚜 Kombaino Grūdų Kūlimo Nuostolių Skaičiuoklė (kg/ha ir €)",
      desc: "Kombaino kontrolės įrankis: pagal rastų grūdų skaičių padėkle už kombaino sužinokite kūlimo nuostolius kg/ha, procentais ir eurais."
    },
    en: {
      title: "Combine Harvester Grain Loss Calculator (kg/ha & %) | JurgisAgro",
      h1: "🚜 Combine Harvester Grain Loss Calculator & Sieve Tuning Guide",
      desc: "Measure combine harvesting grain losses in kg/ha, percentage, and euros based on grain count per drop tray area behind the combine."
    }
  },
  {
    slug: "purkstuvas",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "Purkštuvo Bako Tirpalo ir Chemijos Maišymo Skaičiuoklė | JurgisAgro",
      h1: "💦 Purkštuvo Bako ir Chemikalų Maišymo Skaičiuoklė",
      desc: "Tikslios herbicidų, fungicidų ir skystų trąšų dozės pilnam ir paskutiniam nepilnam purkštuvo bakui."
    },
    en: {
      title: "Sprayer Tank Mix & Chemical Dosing Calculator | JurgisAgro",
      h1: "💦 Agricultural Sprayer Tank Mix & Partial Load Dosing Calculator",
      desc: "Calculate exact herbicide, fungicide, and foliar fertilizer quantities for full and partial sprayer tank loads based on tank capacity and water rate (L/ha)."
    }
  },
  {
    slug: "trasu-skaiciuokle",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "Trąšų N-P-K ir Azoto Savikainos Skaičiuoklė | JurgisAgro",
      h1: "🧪 Trąšų N-P-K Veikliosios Medžiagos ir 1 kg Azoto Kainos Skaičiuoklė",
      desc: "Fizinė amonio salietros, KAS-32, karbamido ir NPK trąšų norma kg/ha pagal gryną maisto medžiagų poreikį bei 1 kg azoto savikaina."
    },
    en: {
      title: "NPK Fertilizer & Pure Nitrogen Cost Calculator | JurgisAgro",
      h1: "🧪 NPK Fertilizer Application Rate & Pure Nitrogen Cost Calculator",
      desc: "Convert target pure N-P-K-S nutrient requirements into physical fertilizer rates (kg/ha or L/ha for UAN-32, Ammonium Nitrate, Urea, DAP) and calculate cost per 1 kg of pure N."
    }
  },
  {
    slug: "trasu-barometras",
    priority: "0.8",
    freq: "daily",
    lt: {
      title: "Trąšų Rinkos Radaras ir Kainų Barometras | JurgisAgro",
      h1: "🧭 Trąšų Kainų Radaras ir 5 Piliastrų Rinkos Barometras",
      desc: "Olandijos TTF gamtinių dujų birža, EUR/USD kursas ir pasaulinis karbamido indeksas: sužinokite amonio salietros savikainą ir kada pirkti trąšas."
    },
    en: {
      title: "Fertilizer Market Radar, TTF Gas & Urea FOB Barometer | JurgisAgro",
      h1: "🧭 5-Pillar Fertilizer Market Radar & Ammonium Nitrate Price Barometer",
      desc: "Track Dutch TTF Natural Gas futures, EUR/USD exchange rates, World Bank Urea FOB prices, and Wheat-to-Fertilizer ratios to time your fertilizer purchases."
    }
  },

  // PAGRINDINIAI SISTEMOS SKYRIAI (TABS)
  {
    slug: "orai",
    priority: "0.9",
    freq: "hourly",
    lt: {
      title: "Agro-Orai Purškimui, Įšalo Gylis ir Žiemkenčių Radaras | JurgisAgro",
      h1: "🌦️ Agro-Meteorologinis Centras: Orai Purškimui, Įšalas ir T-Sum",
      desc: "Tikslūs agro-orai ūkininkams: 48 val. purškimo langas, vėjo greitis ir gūsiai, dirvos temperatūra 6 cm gylyje, įšalas, T-Sum 200 ir sniego pelėsio rizika."
    },
    en: {
      title: "Agro-Weather Spraying Window, Soil Temp & Frost Radar | JurgisAgro",
      h1: "🌦️ Precision Agro-Weather: 48h Spraying Window, Frost, Snow Mold & T-Sum Radar",
      desc: "Field-level agricultural weather radar: 48-hour spraying traffic light (wind speed, gusts, delta-T), 6cm crown depth soil temperature, winterkill, snow mold risk, and spring T-Sum 200/250."
    }
  },
  {
    slug: "laukai",
    priority: "0.9",
    freq: "daily",
    lt: {
      title: "Mano Ūkio Laukai, NMA Žemėlapis ir Sentinel-2 NDVI Palydovas | JurgisAgro",
      h1: "🗺️ Mano Ūkio Laukai, NMA KŽS Žemėlapis ir Sentinel-2 NDVI Palydovas",
      desc: "Interaktyvus ūkio laukų žemėlapis su automatinėmis NMA KŽS ribomis ir Copernicus Sentinel-2 NDVI pasėlių biomasės stebėsena iš kosmoso."
    },
    en: {
      title: "Farm Fields GIS Map & Copernicus Sentinel-2 NDVI Satellite | JurgisAgro",
      h1: "🗺️ Interactive Farm Fields GIS Map & Copernicus Sentinel-2 NDVI Satellite Monitoring",
      desc: "Manage farm fields with one-click LPIS boundary detection, live ESA Copernicus Sentinel-2 NDVI vegetation index, true-color, and soil moisture satellite layers."
    }
  },
  {
    slug: "sejomaina",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "Sėjomainos Planavimas (GAAB 7) ir Ūkio Gamybos Planas | JurgisAgro",
      h1: "🌱 Ūkio Gamybos, Sėklų, Trąšų ir GAAB 7 Sėjomainos Planavimas",
      desc: "Automatinis 3 metų pasėlių kaitos (GAAB 7) tikrinimas, sėklų didmaišių, trąšų ir kuro poreikio planavimas bei NMA deklaravimo GeoJSON eksportas."
    },
    en: {
      title: "Crop Rotation Planner (GAEC 7) & Farm Input Budgeting | JurgisAgro",
      h1: "🌱 Automated Farm Production & EU GAEC 7 Crop Rotation Planner",
      desc: "Plan seasonal crop allocation, verify EU GAEC 7 3-year crop rotation compliance, calculate seed, fertilizer, and fuel budgets, and export LPIS GeoJSON declarations."
    }
  },
  {
    slug: "tresimas-vra",
    priority: "0.9",
    freq: "weekly",
    lt: {
      title: "VRA Kintamos Normos Tręšimo Žemėlapiai Traktoriui (Shapefile) | JurgisAgro",
      h1: "🧪 VRA Kintamos Normos Tręšimo Žemėlapiai (Shapefile į USB)",
      desc: "Tikslusis kintamos normos (VRA) tręšimas pagal palydovinį Sentinel-2 NDVI indeksą su binariniu Shapefile (.ZIP) eksportu į traktoriaus terminalą."
    },
    en: {
      title: "Online VRA Fertilizer Prescription Map & Shapefile Generator | JurgisAgro",
      h1: "🧪 Variable Rate Application (VRA) Fertilizer Map & Binary Shapefile Generator",
      desc: "Generate 3-zone variable rate fertilizer prescription maps from Sentinel-2 NDVI satellite imagery and export binary ESRI Shapefiles (.shp, .shx, .dbf, .prj in .ZIP) for John Deere, Trimble, and Amazone terminals."
    }
  },
  {
    slug: "kalkinimas-vra",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "VRA Dirvos Kalkinimas ir Dirvožemio pH Tyrimų Tinklelis | JurgisAgro",
      h1: "🍋 VRA Dirvos Kalkinimas ir Dirvožemio pH Tyrimų Centras",
      desc: "Dirvožemio ėminių tinklelio generavimas su GPS navigacija, laboratorijos pH interpoliacija ir kintamos normos kalkinimo Shapefile užduotys barstytuvui."
    },
    en: {
      title: "VRA Soil Liming & K-Means Soil Sampling Grid Generator | JurgisAgro",
      h1: "🍋 Precision Soil Sampling Grid, IDW pH Interpolation & VRA Liming Shapefiles",
      desc: "Generate equal-coverage soil sampling grids (1.5, 3, or 5 ha) with GPS walking navigation, interpolate lab pH results using IDW, and export VRA liming Shapefiles."
    }
  },
  {
    slug: "ataskaitos",
    priority: "0.8",
    freq: "weekly",
    lt: {
      title: "NMA Purškimo (AAP) ir Trąšų Apskaitos Žurnalai (PDF / Excel) | JurgisAgro",
      h1: "📄 Oficialūs NMA Purškimo (AAP) ir Trąšų Naudojimo Apskaitos Žurnalai",
      desc: "Oficialių NMA ir VAT patikroms privalomų Augalų apsaugos produktų (purškimo) bei trąšų naudojimo žurnalų generavimas PDF ir Excel formatais."
    },
    en: {
      title: "Official Spraying (PPP) & Fertilizer Compliance Logs (PDF / Excel) | JurgisAgro",
      h1: "📄 Official Plant Protection Products (Spraying) & Fertilizer Compliance Reports",
      desc: "One-click generation of mandatory EU inspection logs for plant protection products (spraying), fertilizer application, and crop yields in printable A4 PDF and Excel (.XLS) formats."
    }
  },
  {
    slug: "paseliu-lyga",
    priority: "0.9",
    freq: "daily",
    lt: {
      title: "Lietuvos Pasėlių Lyga (TOP 10) – Sentinel-2 NDVI Reitingas | JurgisAgro",
      h1: "🏆 Lietuvos Pasėlių Lyga (TOP 10 Rajonų Derbis pagal Sentinel-2 NDVI)",
      desc: "Kurio ūkininko žieminiai kviečiai ir rapsai stipriausi jūsų rajone ir Lietuvoje? Palydovinis Sentinel-2 ir Google Earth Engine pasėlių reitingas."
    },
    en: {
      title: "National Crop League (TOP 10) – Sentinel-2 & Google Earth Engine | JurgisAgro",
      h1: "🏆 National & Regional Crop League (Sentinel-2 NDVI Leaderboard)",
      desc: "Gamified satellite crop benchmarking powered by Google Earth Engine: compare winter wheat and rapeseed biomass scores across 49 districts with GDPR-safe field masking."
    }
  },
  {
    slug: "renginiai",
    priority: "0.8",
    freq: "daily",
    lt: {
      title: "Žemės Ūkio Renginiai, LŽŪKT Mokymai ir Kaimo Šventės | JurgisAgro",
      h1: "🎉 Lietuvos Agro-Renginiai, LŽŪKT Mokymai, Parodos ir Kaimo Šventės",
      desc: "Gyvas Lietuvos agro-renginių kalendorius: kaimo šventės, mugės, LŽŪKT kursai, purškimo pažymėjimai, NMA seminarai ir parodos visuose rajonuose."
    },
    en: {
      title: "Agricultural Events, Field Days, Seminars & Fairs Calendar | JurgisAgro",
      h1: "🎉 Live Agricultural Events, Field Days, Training Courses & Rural Fairs Calendar",
      desc: "Discover upcoming agricultural exhibitions, field days, agronomy seminars, certification courses, and local rural fairs."
    }
  },
  {
    slug: "ismanieji-irenginiai",
    priority: "0.9",
    freq: "daily",
    lt: {
      title: "Išmanieji Ūkio Įrenginiai ir Nord Pool Šilumos Siurblio Valdymas | JurgisAgro",
      h1: "⚡ Išmanieji Ūkio Įrenginiai ir Daikin Altherma Nord Pool Automatika",
      desc: "Automatinis Daikin Altherma šilumos siurblių ir ūkio įrenginių valdymas pagal pigiausias Nord Pool elektros biržos valandas."
    },
    en: {
      title: "Smart Farm IoT & Daikin Altherma Nord Pool Heat Pump Autopilot | JurgisAgro",
      h1: "⚡ Smart IoT Devices & Automated Daikin Altherma Control via Nord Pool Spot Prices",
      desc: "Connect Daikin Onecta Cloud heat pumps and farm IoT devices to automatically heat during the cheapest Nord Pool electricity hours with automatic safety rollback."
    }
  },
  {
    slug: "sos-pagalba",
    priority: "0.8",
    freq: "daily",
    lt: {
      title: "SOS Pagalba Ūkininkams Laukuose ir Technikos Paieška | JurgisAgro",
      h1: "🚨 Skubi SOS Pagalba Ūkininkams Laukuose ir Technikos Paieška",
      desc: "Skubi ūkininkų savitarpio pagalba sugedus traktoriui, kombainui ar įstrigus laukuose jūsų rajone."
    },
    en: {
      title: "SOS Farmer-to-Farmer Field Assistance & Machinery Network | JurgisAgro",
      h1: "🚨 Peer-to-Peer SOS Field Assistance & Agricultural Machinery Sharing Network",
      desc: "Geolocation-based emergency assistance network for farmers: broadcast SOS alerts to nearby neighbors owning specific tractors, combines, or implements within a custom radius."
    }
  }
];

function buildPageHtml(template, { lang, title, desc, h1, canonicalUrl, ltUrl, enUrl }) {
  let html = template;

  // 1. Nustatome <html lang="...">
  html = html.replace(/<html lang="[^"]*"/i, `<html lang="${lang}"`);

  // 2. <title> ir <meta name="description">
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${desc}">`);

  // 3. Canonical ir dvikalbiai hreflang (lt + en + x-default)
  html = html.replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${canonicalUrl}">`);
  html = html.replace(
    /<link rel="alternate" hreflang="lt" href="[^"]*">\s*<link rel="alternate" hreflang="x-default" href="[^"]*">/i,
    `<link rel="alternate" hreflang="lt" href="${ltUrl}">\n    <link rel="alternate" hreflang="en" href="${enUrl}">\n    <link rel="alternate" hreflang="x-default" href="${enUrl}">`
  );

  // 4. Open Graph
  html = html.replace(/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${canonicalUrl}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${title}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${desc}">`);
  html = html.replace(/<meta property="og:locale" content="[^"]*">/i, `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'lt_LT'}">`);

  // 5. <h1> antraštė
  html = html.replace(
    /<h1[^>]*>[\s\S]*?<\/h1>/i,
    `<h1 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">${h1}</h1>`
  );

  return html;
}

// 1. Atnaujiname pagrindinį anglišką /en/index.html
const enHomeHtml = buildPageHtml(baseHtml, {
  lang: "en",
  title: "JurgisAgro – Precision Agriculture, Live MATIF Exchange, VRA Maps & Farm Management",
  desc: "Free all-in-one digital farm management and precision agriculture platform: live Euronext MATIF grain prices, Nord Pool electricity, VRA fertilizer & liming Shapefile generator, Sentinel-2 NDVI satellite maps, and agro-weather.",
  h1: "🚜 JurgisAgro – Digital Farm Management, Live Market Prices & Precision Ag Calculators",
  canonicalUrl: "https://jurgisagro.com/en",
  ltUrl: "https://jurgisagro.com/",
  enUrl: "https://jurgisagro.com/en"
});
fs.writeFileSync(path.join(EN_DIR, "index.html"), enHomeHtml, "utf-8");

let ltCount = 0;
let enCount = 1; // /en/index.html

// 2. Generuojame visus 22 LT ir 22 EN puslapius
for (const page of SEO_PAGES) {
  const ltUrl = `https://jurgisagro.com/${page.slug}`;
  const enUrl = `https://jurgisagro.com/en/${page.slug}`;

  const ltHtml = buildPageHtml(baseHtml, {
    lang: "lt",
    title: page.lt.title,
    desc: page.lt.desc,
    h1: page.lt.h1,
    canonicalUrl: ltUrl,
    ltUrl: ltUrl,
    enUrl: enUrl
  });
  fs.writeFileSync(path.join(__dirname, `${page.slug}.html`), ltHtml, "utf-8");
  ltCount++;

  const enHtml = buildPageHtml(baseHtml, {
    lang: "en",
    title: page.en.title,
    desc: page.en.desc,
    h1: page.en.h1,
    canonicalUrl: enUrl,
    ltUrl: ltUrl,
    enUrl: enUrl
  });
  fs.writeFileSync(path.join(EN_DIR, `${page.slug}.html`), enHtml, "utf-8");
  enCount++;
}

// 3. Automatiškai sugeneruojame pilną dvikalbį sitemap.xml (su xhtml:link hreflang!)
const todayIso = new Date().toISOString().split("T")[0];

let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

    <!-- Pagrindinis LT -->
    <url>
        <loc>https://jurgisagro.com/</loc>
        <lastmod>${todayIso}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
        <xhtml:link rel="alternate" hreflang="lt" href="https://jurgisagro.com/"/>
        <xhtml:link rel="alternate" hreflang="en" href="https://jurgisagro.com/en"/>
        <xhtml:link rel="alternate" hreflang="x-default" href="https://jurgisagro.com/en"/>
        <image:image>
            <image:loc>https://jurgisagro.com/jurgisagro-logo.png</image:loc>
            <image:title>JurgisAgro – Lietuvos ūkininkų portalas ir ūkio valdymo programa</image:title>
        </image:image>
    </url>

    <!-- Main EN -->
    <url>
        <loc>https://jurgisagro.com/en</loc>
        <lastmod>${todayIso}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
        <xhtml:link rel="alternate" hreflang="lt" href="https://jurgisagro.com/"/>
        <xhtml:link rel="alternate" hreflang="en" href="https://jurgisagro.com/en"/>
        <xhtml:link rel="alternate" hreflang="x-default" href="https://jurgisagro.com/en"/>
    </url>
`;

for (const page of SEO_PAGES) {
  const ltUrl = `https://jurgisagro.com/${page.slug}`;
  const enUrl = `https://jurgisagro.com/en/${page.slug}`;

  sitemapXml += `
    <url>
        <loc>${ltUrl}</loc>
        <lastmod>${todayIso}</lastmod>
        <changefreq>${page.freq}</changefreq>
        <priority>${page.priority}</priority>
        <xhtml:link rel="alternate" hreflang="lt" href="${ltUrl}"/>
        <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
        <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>
    </url>
    <url>
        <loc>${enUrl}</loc>
        <lastmod>${todayIso}</lastmod>
        <changefreq>${page.freq}</changefreq>
        <priority>${page.priority}</priority>
        <xhtml:link rel="alternate" hreflang="lt" href="${ltUrl}"/>
        <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
        <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>
    </url>`;
}

sitemapXml += `\n</urlset>\n`;

fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemapXml, "utf-8");

console.log(`✅ Sėkmingai sugeneruota: ${ltCount} LT puslapių + ${enCount} EN puslapių (/en/)!`);
console.log(`🗺️ Sitemap.xml automatiškai atnaujintas (viso ${ltCount + enCount + 1} URL su hreflang)!`);