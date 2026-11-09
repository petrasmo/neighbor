// generateSeoPages.js
const fs = require("fs");
const path = require("path");

const BASE_HTML_PATH = path.join(__dirname, "index.html");
const baseHtml = fs.readFileSync(BASE_HTML_PATH, "utf-8");

const SEO_PAGES = [
  // SKAIČIUOKLĖS
  {
    slug: "nordpool-kainos",
    title: "Nord Pool Elektros Kainos Pavalandžiui Lietuvoje | JurgisAgro",
    h1: "⚡ Nord Pool Elektros Kainos Pavalandžiui (Šiandien ir Rytoj)",
    desc: "Gyvos Nord Pool elektros biržos kainos šiandien ir rytoj pavalandžiui Lietuvoje. Sužinokite pigiausias valandas grūdų bokštų ventiliavimui ir šilumos siurbliams."
  },
  {
    slug: "matif-birza",
    title: "Euronext MATIF Paryžiaus Grūdų ir Rapsų Birža Gyvai | JurgisAgro",
    h1: "📈 Euronext MATIF Grūdų, Kviečių ir Rapsų Biržos Kainos Gyvai",
    desc: "Tiesioginės Euronext MATIF (Paryžiaus biržos) kviečių, rapsų ir kukurūzų kainos, ateities sandoriai (futures) ir 1 metų grafikai realiu laiku."
  },
  {
    slug: "grain-supirkimas",
    title: "Lietuvos Elevatorių Grūdų Supirkimo Kainos ir Logistika | JurgisAgro",
    h1: "🌾 Grūdų Supirkimo Kainos Lietuvos Elevatoriuose ir Skaičiuoklė",
    desc: "Kur labiausiai apsimoka vežti derlių: 45 Lietuvos elevatorių (Linas Agro, Scandagra, Agrokoncertas, Kauno Grūdai) kainų palyginimas, džiovinimo nuoskaitos ir transportas."
  },
  {
    slug: "dyzelinas-gazolas",
    title: "Žymėto Dyzelino (Gazolio) Kaina ir 52 Kuro Bazės | JurgisAgro",
    h1: "⛽ Žymėto Dyzelino (Gazolio) Užsakymas ir Didmeninės Kainos",
    desc: "Didmeninė žymėto dyzelino (gazolio) kaina ūkininkams iš 52 Lietuvos kuro bazių pagal oficialią AB ORLEN Lietuva didmenos bazę su pristatymu į ūkį."
  },
  {
    slug: "grudu-sandelis",
    title: "Grūdų Sandėlis, Bokštų Ventiliavimas (EMC) ir Ekonomika | JurgisAgro",
    h1: "🌾 Grūdų Sandėliavimo Ekonomika ir Bokštų Ventiliavimas (EMC)",
    desc: "Parduoti ar laikyti grūdus? Saugojimo savikainos skaičiuoklė bei protingas bokštų ventiliavimas pagal ASABE Chung-Pfost EMC drėgmės formulę."
  },
  {
    slug: "nma-terminai",
    title: "NMA Terminai, Draudimai ir GAAB Reikalavimai | JurgisAgro",
    h1: "📜 NMA Teisinių Terminų, Mėšlo ir Posėlių Draudimų Šviesoforas",
    desc: "Oficialūs NMA ir LR ŽŪM terminai: mėšlo ir srutų skleidimo draudimai, tarpinių pasėlių išlaikymo datos ir sankcijų prevencija ūkininkams."
  },
  {
    slug: "sejos-norma",
    title: "Tiksli Sėjos Normos (MTG) Skaičiuoklė Ūkiui | JurgisAgro",
    h1: "🌱 Tiksli Sėjos Normos (kg/ha) ir MTG Skaičiuoklė",
    desc: "Apskaičiuokite tikslų kg/ha sėklų poreikį kviečiams, rapsams, miežiams ir žirniams pagal 1000 grūdų masę (MTG), daigumą ir švarumą."
  },
  {
    slug: "tarpiniai-paseliai",
    title: "Tarpinių Pasėlių (Posėlių) Mišinių Skaičiuoklė | JurgisAgro",
    h1: "🌿 Tarpinių Pasėlių (Posėlių) Mišinių ir NMA Ekoschemų Skaičiuoklė",
    desc: "Sudarykite NMA ekoschemas atitinkančius 2–5 augalų tarpinių pasėlių (garstyčių, ridikų, avižų, vikių, facelijų) mišinius ir sužinokite tikslų svorį maišymui."
  },
  {
    slug: "kombaino-nuostoliai",
    title: "Kombaino Kūlimo Nuostolių Skaičiuoklė | JurgisAgro",
    h1: "🚜 Kombaino Grūdų Kūlimo Nuostolių Skaičiuoklė (kg/ha ir €)",
    desc: "Kombaino kontrolės įrankis: pagal rastų grūdų skaičių padėkle už kombaino sužinokite kūlimo nuostolius kg/ha, procentais ir eurais."
  },
  {
    slug: "purkstuvas",
    title: "Purkštuvo Bako Tirpalo ir Chemijos Maišymo Skaičiuoklė | JurgisAgro",
    h1: "💦 Purkštuvo Bako ir Chemikalų Maišymo Skaičiuoklė",
    desc: "Tikslios herbicidų, fungicidų ir skystų trąšų dozės pilnam ir paskutiniam nepilnam purkštuvo bakui."
  },
  {
    slug: "trasu-skaiciuokle",
    title: "Trąšų N-P-K ir Azoto Savikainos Skaičiuoklė | JurgisAgro",
    h1: "🧪 Trąšų N-P-K Veikliosios Medžiagos ir 1 kg Azoto Kainos Skaičiuoklė",
    desc: "Fizinė amonio salietros, KAS-32, karbamido ir NPK trąšų norma kg/ha pagal gryną maisto medžiagų poreikį bei 1 kg azoto savikaina."
  },
  {
    slug: "trasu-barometras",
    title: "Trąšų Rinkos Radaras ir Kainų Barometras | JurgisAgro",
    h1: "🧭 Trąšų Kainų Radaras ir 5 Piliastrų Rinkos Barometras",
    desc: "Olandijos TTF gamtinių dujų birža, EUR/USD kursas ir pasaulinis karbamido indeksas: sužinokite amonio salietros savikainą ir kada pirkti trąšas."
  },

  // PAGRINDINIAI SISTEMOS SKYRIAI (TABS)
  {
    slug: "orai",
    title: "Agro-Orai Purškimui, Įšalo Gylis ir Žiemkenčių Radaras | JurgisAgro",
    h1: "🌦️ Agro-Meteorologinis Centras: Orai Purškimui, Įšalas ir T-Sum",
    desc: "Tikslūs agro-orai ūkininkams: 48 val. purškimo langas, vėjo greitis ir gūsiai, dirvos temperatūra 6 cm gylyje, įšalas, T-Sum 200 ir sniego pelėsio rizika."
  },
  {
    slug: "laukai",
    title: "Mano Ūkio Laukai, NMA Žemėlapis ir Sentinel-2 NDVI Palydovas | JurgisAgro",
    h1: "🗺️ Mano Ūkio Laukai, NMA KŽS Žemėlapis ir Sentinel-2 NDVI Palydovas",
    desc: "Interaktyvus ūkio laukų žemėlapis su automatinėmis NMA KŽS ribomis ir Copernicus Sentinel-2 NDVI pasėlių biomasės stebėsena iš kosmoso."
  },
  {
    slug: "sejomaina",
    title: "Sėjomainos Planavimas (GAAB 7) ir Ūkio Gamybos Planas | JurgisAgro",
    h1: "🌱 Ūkio Gamybos, Sėklų, Trąšų ir GAAB 7 Sėjomainos Planavimas",
    desc: "Automatinis 3 metų pasėlių kaitos (GAAB 7) tikrinimas, sėklų didmaišių, trąšų ir kuro poreikio planavimas bei NMA deklaravimo GeoJSON eksportas."
  },
  {
    slug: "tresimas-vra",
    title: "VRA Kintamos Normos Tręšimo Žemėlapiai Traktoriui (Shapefile) | JurgisAgro",
    h1: "🧪 VRA Kintamos Normos Tręšimo Žemėlapiai (Shapefile į USB)",
    desc: "Tikslusis kintamos normos (VRA) tręšimas pagal palydovinį Sentinel-2 NDVI indeksą su binariniu Shapefile (.ZIP) eksportu į traktoriaus terminalą."
  },
  {
    slug: "kalkinimas-vra",
    title: "VRA Dirvos Kalkinimas ir Dirvožemio pH Tyrimų Tinklelis | JurgisAgro",
    h1: "🍋 VRA Dirvos Kalkinimas ir Dirvožemio pH Tyrimų Centras",
    desc: "Dirvožemio ėminių tinklelio generavimas su GPS navigacija, laboratorijos pH interpoliacija ir kintamos normos kalkinimo Shapefile užduotys barstytuvui."
  },
  {
    slug: "ataskaitos",
    title: "NMA Purškimo (AAP) ir Trąšų Apskaitos Žurnalai (PDF / Excel) | JurgisAgro",
    h1: "📄 Oficialūs NMA Purškimo (AAP) ir Trąšų Naudojimo Apskaitos Žurnalai",
    desc: "Oficialių NMA ir VAT patikroms privalomų Augalų apsaugos produktų (purškimo) bei trąšų naudojimo žurnalų generavimas PDF ir Excel formatais."
  },
  {
    slug: "paseliu-lyga",
    title: "Lietuvos Pasėlių Lyga (TOP 10) – Sentinel-2 NDVI Reitingas | JurgisAgro",
    h1: "🏆 Lietuvos Pasėlių Lyga (TOP 10 Rajonų Derbis pagal Sentinel-2 NDVI)",
    desc: "Kurio ūkininko žieminiai kviečiai ir rapsai stipriausi jūsų rajone ir Lietuvoje? Palydovinis Sentinel-2 ir Google Earth Engine pasėlių reitingas."
  },
  {
    slug: "renginiai",
    title: "Žemės Ūkio Renginiai, LŽŪKT Mokymai ir Kaimo Šventės | JurgisAgro",
    h1: "🎉 Lietuvos Agro-Renginiai, LŽŪKT Mokymai, Parodos ir Kaimo Šventės",
    desc: "Gyvas Lietuvos agro-renginių kalendorius: kaimo šventės, mugės, LŽŪKT kursai, purškimo pažymėjimai, NMA seminarai ir parodos visuose rajonuose."
  },
  {
    slug: "ismanieji-irenginiai",
    title: "Išmanieji Ūkio Įrenginiai ir Nord Pool Šilumos Siurblio Valdymas | JurgisAgro",
    h1: "⚡ Išmanieji Ūkio Įrenginiai ir Daikin Altherma Nord Pool Automatika",
    desc: "Automatinis Daikin Altherma šilumos siurblių ir ūkio įrenginių valdymas pagal pigiausias Nord Pool elektros biržos valandas."
  },
  {
    slug: "sos-pagalba",
    title: "SOS Pagalba Ūkininkams Laukuose ir Technikos Paieška | JurgisAgro",
    h1: "🚨 Skubi SOS Pagalba Ūkininkams Laukuose ir Technikos Paieška",
    desc: "Skubi ūkininkų savitarpio pagalba sugedus traktoriui, kombainui ar įstrigus laukuose jūsų rajone."
  }
];

let count = 0;

for (const page of SEO_PAGES) {
  const fullUrl = `https://jurgisagro.com/${page.slug}`;
  let pageHtml = baseHtml;

  // 1. Pakeičiame <title>
  pageHtml = pageHtml.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${page.title}</title>`
  );

  // 2. Pakeičiame <meta name="description">
  pageHtml = pageHtml.replace(
    /<meta name="description" content="[^"]*">/i,
    `<meta name="description" content="${page.desc}">`
  );

  // 3. Pakeičiame <link rel="canonical">
  pageHtml = pageHtml.replace(
    /<link rel="canonical" href="[^"]*">/i,
    `<link rel="canonical" href="${fullUrl}">`
  );

  // 4. Pakeičiame hreflang
  pageHtml = pageHtml.replace(
    /<link rel="alternate" hreflang="lt" href="[^"]*">/i,
    `<link rel="alternate" hreflang="lt" href="${fullUrl}">`
  );
  pageHtml = pageHtml.replace(
    /<link rel="alternate" hreflang="x-default" href="[^"]*">/i,
    `<link rel="alternate" hreflang="x-default" href="${fullUrl}">`
  );

  // 5. Pakeičiame Open Graph (og:url, og:title, og:description)
  pageHtml = pageHtml.replace(
    /<meta property="og:url" content="[^"]*">/i,
    `<meta property="og:url" content="${fullUrl}">`
  );
  pageHtml = pageHtml.replace(
    /<meta property="og:title" content="[^"]*">/i,
    `<meta property="og:title" content="${page.title}">`
  );
  pageHtml = pageHtml.replace(
    /<meta property="og:description" content="[^"]*">/i,
    `<meta property="og:description" content="${page.desc}">`
  );

  // 6. Pakeičiame pagrindinį <h1> ir aprašymą pačiame HTML dokumente
  pageHtml = pageHtml.replace(
    /<h1[^>]*>[\s\S]*?<\/h1>/i,
    `<h1 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">${page.h1}</h1>`
  );

  const outPath = path.join(__dirname, `${page.slug}.html`);
  fs.writeFileSync(outPath, pageHtml, "utf-8");
  count++;
}

console.log(`✅ Sėkmingai sugeneruoti ${count} fiziniai SEO puslapiai!`);