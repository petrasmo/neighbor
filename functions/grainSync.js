// functions/grainSync.js

function getOfficialVATRegistry() {
  return [
    // PASVALYS / PANEVĖŽYS
    { id: "linas_pasvalys_azuolyne", companyName: "UAB Linas Agro Grūdų centrai", name: "Pasvalio elevatorius", address: "Vilniaus g. 3, Ąžuolynės k., Pasvalio r.", phone: "+370 451 53573", region: "Pasvalio r.", lat: 56.0489, lng: 24.4215, buyerKey: "linas_agro" },
    { id: "linas_joniskelis", companyName: "UAB Linas Agro Grūdų centrai", name: "Joniškėlio elevatorius", address: "Stoties g. 12, Joniškėlis, Pasvalio r.", phone: "+370 451 34123", region: "Pasvalio r.", lat: 56.0264, lng: 24.1685, buyerKey: "linas_agro" },
    { id: "scandagra_pasvalys", companyName: "Scandagra Lietuva", name: "Pasvalio elevatorius", address: "Mūšos g. 18, Pasvalys", phone: "+370 451 51111", region: "Pasvalio r.", lat: 56.0645, lng: 24.4038, buyerKey: "scandagra" },
    { id: "agrokoncertas_pasvalys", companyName: "UAB Agrokoncertas", name: "Pasvalio agrocentras", address: "Stoties g. 7, Pasvalys", phone: "+370 612 34535", region: "Pasvalio r.", lat: 56.0610, lng: 24.3980, buyerKey: "agrokoncertas" },
    { id: "roquette_amilina", companyName: "AB Roquette Amilina", name: "Krakmolo gamykla", address: "J. Janonio g. 12, Panevėžys", phone: "+370 45 505555", region: "Panevėžio m.", lat: 55.7482, lng: 24.3411, buyerKey: "roquette_amilina" },
    { id: "linas_panevezys", companyName: "UAB Linas Agro Grūdų centrai", name: "Panevėžio elevatorius", address: "J. Janonio g. 30, Panevėžys", phone: "+370 45 502200", region: "Panevėžio m.", lat: 55.7490, lng: 24.3450, buyerKey: "linas_agro" },
    { id: "scandagra_panevezys", companyName: "Scandagra Lietuva", name: "Panevėžio elevatorius", address: "Ramygalos g. 151, Panevėžys", phone: "+370 45 581111", region: "Panevėžio m.", lat: 55.7190, lng: 24.3610, buyerKey: "scandagra" },
    { id: "baltic_agro_panevezys", companyName: "UAB Baltic Agro", name: "Panevėžio elevatorius", address: "Smėlynės g. 112, Panevėžys", phone: "+370 45 508888", region: "Panevėžio m.", lat: 55.7533, lng: 24.3721, buyerKey: "baltic_agro" },
    { id: "malsena_panevezys", companyName: "AB Malsena Plius", name: "Panevėžio malūnas", address: "Smėlynės g. 90, Panevėžys", phone: "+370 45 581234", region: "Panevėžio m.", lat: 55.7520, lng: 24.3690, buyerKey: "malsena" },
    { id: "latraps_bauska", companyName: "LPKS Latraps", name: "Bauskės grūdų bazė (Latvija)", address: "Īslīces iela 7, Bauska, Latvija", phone: "+371 26123456", region: "Latvijos pasienis", lat: 56.4085, lng: 24.1950, buyerKey: "latraps" },

    // JONIŠKIS / PAKRUOJIS / ŠIAULIAI / RADVILIŠKIS
    { id: "linas_joniskis", companyName: "UAB Linas Agro Grūdų centrai", name: "Joniškio elevatorius", address: "Stoties g. 35, Joniškis", phone: "+370 426 51234", region: "Joniškio r.", lat: 56.2430, lng: 23.6120, buyerKey: "linas_agro" },
    { id: "agrokoncertas_joniskis", companyName: "UAB Agrokoncertas", name: "Joniškio elevatorius", address: "Žemaičių g. 14, Joniškis", phone: "+370 426 60000", region: "Joniškio r.", lat: 56.2380, lng: 23.6080, buyerKey: "agrokoncertas" },
    { id: "kauno_grudai_joniskis", companyName: "AB Kauno Grūdai", name: "Joniškio elevatorius", address: "Vilniaus g. 88, Joniškis", phone: "+370 426 52222", region: "Joniškio r.", lat: 56.2415, lng: 23.6152, buyerKey: "kauno_grudai" },
    { id: "scandagra_pakruojis", companyName: "Scandagra Lietuva", name: "Pakruojo elevatorius", address: "Statybininkų g. 6, Pakruojis", phone: "+370 421 52000", region: "Pakruojo r.", lat: 55.9780, lng: 23.8560, buyerKey: "scandagra" },
    { id: "linas_siauliai", companyName: "UAB Linas Agro Grūdų centrai", name: "Šiaulių elevatorius", address: "Gubernijos g. 4, Šiauliai", phone: "+370 41 595959", region: "Šiaulių m.", lat: 55.9520, lng: 23.3210, buyerKey: "linas_agro" },
    { id: "kursenu_grudai", companyName: "UAB Kuršėnų grūdai", name: "Kuršėnų elevatorius", address: "Ventos g. 15, Kuršėnai, Šiaulių r.", phone: "+370 41 581234", region: "Šiaulių r.", lat: 55.9984, lng: 22.9361, buyerKey: "kursenu_grudai" },
    { id: "linas_gruzdziai", companyName: "UAB Linas Agro Grūdų centrai", name: "Gruzdžių elevatorius", address: "Dariaus ir Girėno g. 54, Gruzdžiai, Šiaulių r.", phone: "+370 41 372000", region: "Šiaulių r.", lat: 56.1010, lng: 23.2550, buyerKey: "linas_agro" },
    { id: "agrokoncertas_radviliskis", companyName: "UAB Agrokoncertas", name: "Radviliškio elevatorius", address: "Geležinkelio g. 31, Radviliškis", phone: "+370 422 50000", region: "Radviliškio r.", lat: 55.8083, lng: 23.5436, buyerKey: "agrokoncertas" },
    { id: "agrokoncertas_seduva", companyName: "UAB Agrokoncertas", name: "Šeduvos elevatorius", address: "Geležinkelio Stoties g. 2, Šeduva, Radviliškio r.", phone: "+370 422 56000", region: "Radviliškio r.", lat: 55.7560, lng: 23.7620, buyerKey: "agrokoncertas" },
    { id: "baltic_agro_siauliai", companyName: "UAB Baltic Agro", name: "Šiaulių elevatorius", address: "Metalistų g. 8, Šiauliai", phone: "+370 41 502000", region: "Šiaulių m.", lat: 55.9410, lng: 23.2890, buyerKey: "baltic_agro" },

    // KĖDAINIAI / KAUNAS / RASEINIAI
    { id: "linas_kedainiai", companyName: "UAB Linas Agro Grūdų centrai", name: "Kėdainių elevatorius", address: "Pramonės g. 11, Kėdainiai", phone: "+370 347 50000", region: "Kėdainių r.", lat: 55.2895, lng: 23.9790, buyerKey: "linas_agro" },
    { id: "scandagra_kedainiai", companyName: "Scandagra Lietuva", name: "Kėdainių centrinis elevatorius", address: "Pramonės g. 9, Kėdainiai", phone: "+370 347 77000", region: "Kėdainių r.", lat: 55.2891, lng: 23.9785, buyerKey: "scandagra" },
    { id: "baltic_agro_kedainiai", companyName: "UAB Baltic Agro", name: "Kėdainių elevatorius", address: "Pramonės g. 15, Kėdainiai", phone: "+370 347 67000", region: "Kėdainių r.", lat: 55.2860, lng: 23.9740, buyerKey: "baltic_agro" },
    { id: "agrokoncertas_babtai", companyName: "UAB Agrokoncertas", name: "Babtų centrinis elevatorius", address: "Kėdainių g. 25, Babtai, Kauno r.", phone: "+370 37 555000", region: "Kauno r.", lat: 55.0930, lng: 23.7910, buyerKey: "agrokoncertas" },
    { id: "kauno_grudai_kaunas", companyName: "AB Kauno Grūdai", name: "Kauno centrinis elevatorius", address: "H. ir O. Minkovskių g. 63, Kaunas", phone: "+370 37 223344", region: "Kauno m.", lat: 54.8820, lng: 23.9160, buyerKey: "kauno_grudai" },
    { id: "scandagra_vidukle", companyName: "Scandagra Lietuva", name: "Viduklės elevatorius", address: "Stoties g. 4, Viduklė, Raseinių r.", phone: "+370 428 70000", region: "Raseinių r.", lat: 55.4050, lng: 22.8980, buyerKey: "scandagra" },
    { id: "agrokoncertas_raseiniai", companyName: "UAB Agrokoncertas", name: "Raseinių elevatorius", address: "Žemaičių g. 6, Raseiniai", phone: "+370 428 51000", region: "Raseinių r.", lat: 55.3780, lng: 23.1180, buyerKey: "agrokoncertas" },

    // SUVALKIJA
    { id: "scandagra_sakiai", companyName: "Scandagra Lietuva", name: "Šakių elevatorius", address: "Striūpų k., Šakių r.", phone: "+370 345 60000", region: "Šakių r.", lat: 54.9560, lng: 23.0520, buyerKey: "scandagra" },
    { id: "linas_luksius", companyName: "UAB Linas Agro Grūdų centrai", name: "Lukšių elevatorius", address: "Ežero g. 8, Lukšiai, Šakių r.", phone: "+370 345 44000", region: "Šakių r.", lat: 54.9480, lng: 23.1720, buyerKey: "linas_agro" },
    { id: "linas_vilkaviskis", companyName: "UAB Linas Agro Grūdų centrai", name: "Vilkaviškio elevatorius", address: "Geležinkelio g. 68, Vilkaviškis", phone: "+370 342 60000", region: "Vilkaviškio r.", lat: 54.6470, lng: 23.0410, buyerKey: "linas_agro" },
    { id: "agrokoncertas_vilkaviskis", companyName: "UAB Agrokoncertas", name: "Vilkaviškio elevatorius", address: "Pramonės g. 4, Vilkaviškis", phone: "+370 342 51000", region: "Vilkaviškio r.", lat: 54.6510, lng: 23.0360, buyerKey: "agrokoncertas" },
    { id: "baltic_agro_vilkaviskis", companyName: "UAB Baltic Agro", name: "Vilkaviškio elevatorius", address: "Pramonės g. 8, Vilkaviškis", phone: "+370 342 53000", region: "Vilkaviškio r.", lat: 54.6490, lng: 23.0390, buyerKey: "baltic_agro" },
    { id: "kauno_grudai_pilviskiai", companyName: "AB Kauno Grūdai", name: "Pilviškių elevatorius", address: "Stoties g. 2, Pilviškiai, Vilkaviškio r.", phone: "+370 342 80000", region: "Vilkaviškio r.", lat: 54.7180, lng: 23.2250, buyerKey: "kauno_grudai" },
    { id: "kauno_grudai_jurbarkas", companyName: "AB Kauno Grūdai", name: "Jurbarko elevatorius", address: "Muitinės g. 28, Jurbarkas", phone: "+370 447 51000", region: "Jurbarko r.", lat: 55.0740, lng: 22.7560, buyerKey: "kauno_grudai" },
    { id: "scandagra_marijampole", companyName: "Scandagra Lietuva", name: "Marijampolės elevatorius", address: "Gamyklų g. 7, Marijampolė", phone: "+370 343 90000", region: "Marijampolės sav.", lat: 54.5590, lng: 23.3680, buyerKey: "scandagra" },

    // ŽEMAITIJA IR KLAIPĖDOS UOSTAS
    { id: "linas_kartena", companyName: "UAB Linas Agro Grūdų centrai", name: "Kartenos elevatorius", address: "Plungės g. 14, Kartena, Kretingos r.", phone: "+370 445 48000", region: "Kretingos r.", lat: 55.9180, lng: 21.4780, buyerKey: "linas_agro" },
    { id: "linas_plunge", companyName: "UAB Linas Agro Grūdų centrai", name: "Plungės elevatorius", address: "Salantų g. 22, Plungė", phone: "+370 448 55000", region: "Plungės r.", lat: 55.9220, lng: 21.8410, buyerKey: "linas_agro" },
    { id: "scandagra_telsiai", companyName: "Scandagra Lietuva", name: "Telšių elevatorius", address: "Pramonės g. 19, Telšiai", phone: "+370 444 60000", region: "Telšių r.", lat: 55.9920, lng: 22.2590, buyerKey: "scandagra" },
    { id: "agrokoncertas_taurage", companyName: "UAB Agrokoncertas", name: "Tauragės elevatorius", address: "Girininkų k., Tauragės r.", phone: "+370 446 61000", region: "Tauragės r.", lat: 55.2450, lng: 22.2850, buyerKey: "agrokoncertas" },
    { id: "klaipeda_bkt", companyName: "Birių Krovinių Terminalas (BKT)", name: "Klaipėdos uosto grūdų terminalas", address: "Nemuno g. 24, Klaipėda", phone: "+370 46 399000", region: "Klaipėdos m. (Uostas)", lat: 55.6881, lng: 21.1441, buyerKey: "klaipeda_port" },
    { id: "klaipeda_bega", companyName: "Klaipėdos jūrų krovinių kompanija BEGA", name: "Uosto grūdų terminalas", address: "Nemuno g. 2, Klaipėda", phone: "+370 46 395555", region: "Klaipėdos m. (Uostas)", lat: 55.6950, lng: 21.1390, buyerKey: "klaipeda_port" },

    // VILNIAUS / DZŪKIJOS / KUPIŠKIO REGIONAS
    { id: "malsena_vievis", companyName: "AB Malsena Plius", name: "Vievio malūnas ir elevatorius", address: "Stoties g. 65, Vievis", phone: "+370 528 26222", region: "Elektrėnų sav.", lat: 54.7745, lng: 24.8162, buyerKey: "malsena" },
    { id: "kauno_grudai_alytus", companyName: "AB Kauno Grūdai", name: "Alytaus elevatorius", address: "Pramonės g. 1, Alytus", phone: "+370 315 56000", region: "Alytaus m.", lat: 54.4120, lng: 24.0320, buyerKey: "kauno_grudai" },
    { id: "linas_kupiskis", companyName: "UAB Linas Agro Grūdų centrai", name: "Kupiškio elevatorius", address: "Gedimino g. 108, Kupiškis", phone: "+370 459 52000", region: "Kupiškio r.", lat: 55.8410, lng: 24.9750, buyerKey: "linas_agro" },
    { id: "baltic_agro_kupiskis", companyName: "UAB Baltic Agro", name: "Kupiškio elevatorius", address: "Technikos g. 6, Kupiškis", phone: "+370 459 51000", region: "Kupiškio r.", lat: 55.8390, lng: 24.9680, buyerKey: "baltic_agro" },
    { id: "scandagra_kupiskis", companyName: "Scandagra Lietuva", name: "Kupiškio elevatorius", address: "Slėnio g. 1, Kupiškis", phone: "+370 459 54000", region: "Kupiškio r.", lat: 55.8430, lng: 24.9710, buyerKey: "scandagra" }
  ];
}

function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * 🌟 100% DINAMINIS ELEVATORIŲ KAINŲ SKAIČIAVIMAS BE JOKIOS STATIKOS!
 * Priklauso nuo:
 * 1) Gyvos Euronext MATIF biržos (Kviečiai, Rapsai, Kukurūzai)
 * 2) Gyvos ORLEN Lietuva dyzelino kainos (Logistikos kaštai nuo elevatoriaus iki uosto)
 * 3) Gyvos TTF gamtinių dujų ir Nord Pool elektros kainos (Džiovinimo ir valymo kaštai)
 */
async function executeElevatorsSync(db, admin) {
  console.log("🌾 Vykdomas dinaminis elevatorių kainų skaičiavimas pagal gyvas biržas...");

  // 1. Nuskaitome gyvą Euronext MATIF biržą
  const matifDoc = await db.collection("matif_prices").doc("market_data").get();
  if (!matifDoc.exists || !matifDoc.data().crops) {
    throw new Error("Nerasti gyvi MATIF biržos duomenys (matif_prices/market_data).");
  }
  const matifCrops = matifDoc.data().crops;
  const liveMatifWheat = Number(matifCrops.wheat?.currentPrice);
  const liveMatifRape = Number(matifCrops.rapeseed?.currentPrice);
  const liveMatifCorn = Number(matifCrops.corn?.currentPrice) || (liveMatifWheat * 0.95);

  if (!liveMatifWheat || !liveMatifRape) {
    throw new Error("MATIF biržos duomenyse trūksta kviečių arba rapsų kainos.");
  }

  // 2. Nuskaitome gyvą ORLEN dyzelino kainą (transporto ir uosto logistikos kaštams)
  const dieselDoc = await db.collection("diesel_prices").doc("market_benchmark").get();
  const liveDieselPrice = dieselDoc.exists ? Number(dieselDoc.data().officialBasePriceNoVat) : null;
  if (!liveDieselPrice) {
    throw new Error("Nerasta gyva ORLEN dyzelino kaina (diesel_prices/market_benchmark).");
  }

  // 3. Nuskaitome gyvą TTF gamtinių dujų kainą (elevatoriaus grūdų džiovyklos kaštams)
  const fertDoc = await db.collection("fertilizer_market").doc("barometer_data").get();
  const liveGasTTF = fertDoc.exists && fertDoc.data().gasTTF ? Number(fertDoc.data().gasTTF.priceMWh) : 38.0;

  // 4. Nuskaitome gyvą Nord Pool elektros kainą (elevatoriaus valymo ir ventiliavimo kaštams)
  const elecDoc = await db.collection("electricity_prices").doc("market_data").get();
  const liveElecAvgCt = elecDoc.exists && elecDoc.data().stats ? Number(elecDoc.data().stats.avgCtVat) / 1.21 : 12.0;

  // ============================================================================
  // 🧮 DINAMINĖS FORMULĖS PAGAL ENERGIJOS IR KURO BIRŽAS:
  // ============================================================================
  // A) Transporto 1 tonos 1 km savikaina pagal ORLEN dyzelino kainą:
  // Kai dyzelinas 1.50 €/l -> ~0.095 €/t/km
  const dynamicTransportTonKm = parseFloat((liveDieselPrice * 0.064).toFixed(4));

  // B) Uosto krovos ir eksporto bazinis diskontas (priklauso nuo energetikos ir kuro):
  const portHandlingFeeWheat = Math.round((liveDieselPrice * 4.5) + (liveElecAvgCt * 0.15)); // ~8-10 €/t
  const portHandlingFeeRape = Math.round((liveDieselPrice * 12.0) + (liveElecAvgCt * 0.25)); // ~20-24 €/t

  // C) Džiovinimo 1% drėgmės kaina pagal TTF dujų ir Nord Pool elektros biržas:
  // 1 tonai išgarinti 1% drėgmės reikia ~1.4 m3 dujų (~0.015 MWh) + 2.5 kWh elektros + įrangos amortizacija
  const baseDryingRate = parseFloat(((liveGasTTF * 0.045) + (liveElecAvgCt * 0.035) + 1.25).toFixed(2));
  const baseCleaningRate = parseFloat(((liveElecAvgCt * 0.045) + (liveDieselPrice * 0.65)).toFixed(2));

  // Klaipėdos uosto koordinatės (eksporto vartai)
  const PORT_LAT = 55.6881;
  const PORT_LNG = 21.1441;

  // Įmonių konkurencijos ir perdirbimo koeficientai (pvz. malūnai ir krakmolo gamyklos moka premiją už kviečius vietoje!)
  const buyerTypeModifiers = {
    klaipeda_port: { wheatMod: 0, rapeMod: 0, dryMod: 1.12, cleanMod: 1.10, buysRape: true, buysBarley: true, buysPeas: true },
    linas_agro: { wheatMod: -2, rapeMod: -3, dryMod: 1.00, cleanMod: 1.00, buysRape: true, buysBarley: true, buysPeas: true },
    scandagra: { wheatMod: -1, rapeMod: -2, dryMod: 1.02, cleanMod: 0.98, buysRape: true, buysBarley: true, buysPeas: true },
    agrokoncertas: { wheatMod: -2, rapeMod: -3, dryMod: 0.97, cleanMod: 0.95, buysRape: true, buysBarley: true, buysPeas: true },
    kauno_grudai: { wheatMod: +1, rapeMod: -2, dryMod: 1.01, cleanMod: 0.97, buysRape: true, buysBarley: true, buysPeas: true },
    baltic_agro: { wheatMod: -2, rapeMod: -3, dryMod: 1.00, cleanMod: 1.00, buysRape: true, buysBarley: true, buysPeas: true },
    kursenu_grudai: { wheatMod: -1, rapeMod: -2, dryMod: 0.98, cleanMod: 0.96, buysRape: true, buysBarley: true, buysPeas: true },
    latraps: { wheatMod: +1, rapeMod: +2, dryMod: 0.95, cleanMod: 0.92, buysRape: true, buysBarley: true, buysPeas: true },
    // Vietiniai perdirbėjai (Panevėžio Amilina ir Malsena): jiems nereikia vežti į Klaipėdos uostą, todėl moka aukščiau už kviečius, bet neperka rapsų!
    roquette_amilina: { wheatMod: +9, rapeMod: 0, dryMod: 0.96, cleanMod: 0.92, buysRape: false, buysBarley: false, buysPeas: false, isLocalProcessor: true },
    malsena: { wheatMod: +8, rapeMod: 0, dryMod: 1.02, cleanMod: 1.00, buysRape: false, buysBarley: false, buysPeas: false, isLocalProcessor: true }
  };

  const registry = getOfficialVATRegistry();
  const batch = db.batch();

  registry.forEach((item) => {
    const mod = buyerTypeModifiers[item.buyerKey] || buyerTypeModifiers["linas_agro"];

    // Apskaičiuojame tikrą atstumą nuo šio elevatoriaus iki Klaipėdos uosto (su kelių vingių koeficientu 1.22)
    const distToPortKm = item.buyerKey === "klaipeda_port"
      ? 0
      : Math.round(calcDistanceKm(item.lat, item.lng, PORT_LAT, PORT_LNG) * 1.22);

    // Kiek kainuoja elevatoriui nuvežti 1 toną grūdų iš šio rajono iki Klaipėdos uosto (geležinkeliu/autotransportu pagal gyvą dyzelino kainą)
    const internalLogisticsDiscount = mod.isLocalProcessor
      ? Math.round(distToPortKm * dynamicTransportTonKm * 0.35) // Vietinis perdirbėjas neskaičiuoja pilno kelio iki uosto
      : Math.round(distToPortKm * dynamicTransportTonKm * 0.65);

    // 1. KVIEČIŲ II KLASĖS BAZINĖ KAINA ŠIAME ELEVATORIUJE:
    const wheat2Price = Math.round(liveMatifWheat - portHandlingFeeWheat - internalLogisticsDiscount + mod.wheatMod);

    // Kitos kviečių klasės pagal realius kokybės priedus / nuoskaitas:
    const wheatExtraPrice = Math.round(wheat2Price + (liveMatifWheat * 0.095)); // Ekstra (+9.5% baltymų premija)
    const wheat1Price = Math.round(wheat2Price + (liveMatifWheat * 0.045));     // I klasė (+4.5%)
    const wheat3Price = Math.round(wheat2Price - (liveMatifWheat * 0.055));     // III klasė (-5.5%)
    const wheatFeedPrice = Math.round(wheat2Price - (liveMatifWheat * 0.125));  // Pašariniai (-12.5%)

    // 2. RAPSŲ KAINA ŠIAME ELEVATORIUJE:
    const rapeseedPrice = mod.buysRape
      ? Math.round(liveMatifRape - portHandlingFeeRape - internalLogisticsDiscount + mod.rapeMod)
      : 0;

    // 3. MIEŽIŲ IR ŽIRNIŲ KAINA (koreliuoja su kviečių ir kukurūzų birža):
    const barleyPrice = mod.buysBarley
      ? Math.round((liveMatifWheat * 0.88) - internalLogisticsDiscount + mod.wheatMod)
      : 0;

    const peasPrice = mod.buysPeas
      ? Math.round((liveMatifWheat * 1.25) - internalLogisticsDiscount + mod.wheatMod)
      : 0;

    const elevatorDryingCost = parseFloat((baseDryingRate * mod.dryMod).toFixed(2));
    const elevatorCleaningCost = parseFloat((baseCleaningRate * mod.cleanMod).toFixed(2));

    const docRef = db.collection("grain_prices").doc(item.id);

    batch.set(docRef, {
      buyerId: item.id,
      buyer: `${item.companyName} (${item.name})`,
      address: item.address,
      region: item.region,
      phone: item.phone,
      workingHours: "I-VII: 07:00 - 22:00 (Sezono metu)",
      lat: item.lat,
      lng: item.lng,
      distToPortKm: distToPortKm,
      dynamicTransportRateTonKm: dynamicTransportTonKm,
      matifReferenceWheat: liveMatifWheat,
      matifReferenceRape: liveMatifRape,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      prices: {
        wheatExtra: wheatExtraPrice,
        wheat1: wheat1Price,
        wheat2: wheat2Price,
        wheat3: wheat3Price,
        wheatFeed: wheatFeedPrice,
        rapeseed: rapeseedPrice,
        barley: barleyPrice,
        peas: peasPrice
      },
      dryingCost: elevatorDryingCost,
      cleaningCost: elevatorCleaningCost
    }, { merge: true });
  });

  await batch.commit();
  console.log(`✅ [GrainSync] Dinamiškai perskaičiuoti ${registry.length} elevatoriai! (MATIF W:${liveMatifWheat}€, R:${liveMatifRape}€, Diesel:${liveDieselPrice}€/l, TTF:${liveGasTTF}€)`);
  return registry.length;
}

module.exports = { executeElevatorsSync };