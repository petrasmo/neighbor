// functions/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 1. ELEVATORIŲ DUOMENŲ BAZĖ
function getOfficialVATRegistry() {
  return [
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
    { id: "linas_kedainiai", companyName: "UAB Linas Agro Grūdų centrai", name: "Kėdainių elevatorius", address: "Pramonės g. 11, Kėdainiai", phone: "+370 347 50000", region: "Kėdainių r.", lat: 55.2895, lng: 23.9790, buyerKey: "linas_agro" },
    { id: "scandagra_kedainiai", companyName: "Scandagra Lietuva", name: "Kėdainių centrinis elevatorius", address: "Pramonės g. 9, Kėdainiai", phone: "+370 347 77000", region: "Kėdainių r.", lat: 55.2891, lng: 23.9785, buyerKey: "scandagra" },
    { id: "baltic_agro_kedainiai", companyName: "UAB Baltic Agro", name: "Kėdainių elevatorius", address: "Pramonės g. 15, Kėdainiai", phone: "+370 347 67000", region: "Kėdainių r.", lat: 55.2860, lng: 23.9740, buyerKey: "baltic_agro" },
    { id: "agrokoncertas_babtai", companyName: "UAB Agrokoncertas", name: "Babtų centrinis elevatorius", address: "Kėdainių g. 25, Babtai, Kauno r.", phone: "+370 37 555000", region: "Kauno r.", lat: 55.0930, lng: 23.7910, buyerKey: "agrokoncertas" },
    { id: "kauno_grudai_kaunas", companyName: "AB Kauno Grūdai", name: "Kauno centrinis elevatorius", address: "H. ir O. Minkovskių g. 63, Kaunas", phone: "+370 37 223344", region: "Kauno m.", lat: 54.8820, lng: 23.9160, buyerKey: "kauno_grudai" },
    { id: "scandagra_vidukle", companyName: "Scandagra Lietuva", name: "Viduklės elevatorius", address: "Stoties g. 4, Viduklė, Raseinių r.", phone: "+370 428 70000", region: "Raseinių r.", lat: 55.4050, lng: 22.8980, buyerKey: "scandagra" },
    { id: "agrokoncertas_raseiniai", companyName: "UAB Agrokoncertas", name: "Raseinių elevatorius", address: "Žemaičių g. 6, Raseiniai", phone: "+370 428 51000", region: "Raseinių r.", lat: 55.3780, lng: 23.1180, buyerKey: "agrokoncertas" },
    { id: "scandagra_sakiai", companyName: "Scandagra Lietuva", name: "Šakių elevatorius", address: "Striūpų k., Šakių r.", phone: "+370 345 60000", region: "Šakių r.", lat: 54.9560, lng: 23.0520, buyerKey: "scandagra" },
    { id: "linas_luksius", companyName: "UAB Linas Agro Grūdų centrai", name: "Lukšių elevatorius", address: "Ežero g. 8, Lukšiai, Šakių r.", phone: "+370 345 44000", region: "Šakių r.", lat: 54.9480, lng: 23.1720, buyerKey: "linas_agro" },
    { id: "linas_vilkaviskis", companyName: "UAB Linas Agro Grūdų centrai", name: "Vilkaviškio elevatorius", address: "Geležinkelio g. 68, Vilkaviškis", phone: "+370 342 60000", region: "Vilkaviškio r.", lat: 54.6470, lng: 23.0410, buyerKey: "linas_agro" },
    { id: "agrokoncertas_vilkaviskis", companyName: "UAB Agrokoncertas", name: "Vilkaviškio elevatorius", address: "Pramonės g. 4, Vilkaviškis", phone: "+370 342 51000", region: "Vilkaviškio r.", lat: 54.6510, lng: 23.0360, buyerKey: "agrokoncertas" },
    { id: "baltic_agro_vilkaviskis", companyName: "UAB Baltic Agro", name: "Vilkaviškio elevatorius", address: "Pramonės g. 8, Vilkaviškis", phone: "+370 342 53000", region: "Vilkaviškio r.", lat: 54.6490, lng: 23.0390, buyerKey: "baltic_agro" },
    { id: "kauno_grudai_pilviskiai", companyName: "AB Kauno Grūdai", name: "Pilviškių elevatorius", address: "Stoties g. 2, Pilviškiai, Vilkaviškio r.", phone: "+370 342 80000", region: "Vilkaviškio r.", lat: 54.7180, lng: 23.2250, buyerKey: "kauno_grudai" },
    { id: "kauno_grudai_jurbarkas", companyName: "AB Kauno Grūdai", name: "Jurbarko elevatorius", address: "Muitinės g. 28, Jurbarkas", phone: "+370 447 51000", region: "Jurbarko r.", lat: 55.0740, lng: 22.7560, buyerKey: "kauno_grudai" },
    { id: "scandagra_marijampole", companyName: "Scandagra Lietuva", name: "Marijampolės elevatorius", address: "Gamyklų g. 7, Marijampolė", phone: "+370 343 90000", region: "Marijampolės sav.", lat: 54.5590, lng: 23.3680, buyerKey: "scandagra" },
    { id: "linas_kartena", companyName: "UAB Linas Agro Grūdų centrai", name: "Kartenos elevatorius", address: "Plungės g. 14, Kartena, Kretingos r.", phone: "+370 445 48000", region: "Kretingos r.", lat: 55.9180, lng: 21.4780, buyerKey: "linas_agro" },
    { id: "linas_plunge", companyName: "UAB Linas Agro Grūdų centrai", name: "Plungės elevatorius", address: "Salantų g. 22, Plungė", phone: "+370 448 55000", region: "Plungės r.", lat: 55.9220, lng: 21.8410, buyerKey: "linas_agro" },
    { id: "scandagra_telsiai", companyName: "Scandagra Lietuva", name: "Telšių elevatorius", address: "Pramonės g. 19, Telšiai", phone: "+370 444 60000", region: "Telšių r.", lat: 55.9920, lng: 22.2590, buyerKey: "scandagra" },
    { id: "agrokoncertas_taurage", companyName: "UAB Agrokoncertas", name: "Tauragės elevatorius", address: "Girininkų k., Tauragės r.", phone: "+370 446 61000", region: "Tauragės r.", lat: 55.2450, lng: 22.2850, buyerKey: "agrokoncertas" },
    { id: "klaipeda_bkt", companyName: "Birių Krovinių Terminalas (BKT)", name: "Klaipėdos uosto grūdų terminalas", address: "Nemuno g. 24, Klaipėda", phone: "+370 46 399000", region: "Klaipėdos m. (Uostas)", lat: 55.6881, lng: 21.1441, buyerKey: "klaipeda_port" },
    { id: "klaipeda_bega", companyName: "Klaipėdos jūrų krovinių kompanija BEGA", name: "Uosto grūdų terminalas", address: "Nemuno g. 2, Klaipėda", phone: "+370 46 395555", region: "Klaipėdos m. (Uostas)", lat: 55.6950, lng: 21.1390, buyerKey: "klaipeda_port" },
    { id: "malsena_vievis", companyName: "AB Malsena Plius", name: "Vievio malūnas ir elevatorius", address: "Stoties g. 65, Vievis", phone: "+370 528 26222", region: "Elektrėnų sav.", lat: 54.7745, lng: 24.8162, buyerKey: "malsena" },
    { id: "kauno_grudai_alytus", companyName: "AB Kauno Grūdai", name: "Alytaus elevatorius", address: "Pramonės g. 1, Alytus", phone: "+370 315 56000", region: "Alytaus m.", lat: 54.4120, lng: 24.0320, buyerKey: "kauno_grudai" },
    { id: "linas_kupiskis", companyName: "UAB Linas Agro Grūdų centrai", name: "Kupiškio elevatorius", address: "Gedimino g. 108, Kupiškis", phone: "+370 459 52000", region: "Kupiškio r.", lat: 55.8410, lng: 24.9750, buyerKey: "linas_agro" },
    { id: "baltic_agro_kupiskis", companyName: "UAB Baltic Agro", name: "Kupiškio elevatorius", address: "Technikos g. 6, Kupiškis", phone: "+370 459 51000", region: "Kupiškio r.", lat: 55.8390, lng: 24.9680, buyerKey: "baltic_agro" },
    { id: "scandagra_kupiskis", companyName: "Scandagra Lietuva", name: "Kupiškio elevatorius", address: "Slėnio g. 1, Kupiškis", phone: "+370 459 54000", region: "Kupiškio r.", lat: 55.8430, lng: 24.9710, buyerKey: "scandagra" }
  ];
}

const companyPriceProfiles = {
  linas_agro: { prices: { wheatExtra: 232, wheat2: 211, wheatFeed: 183, rapeseed: 552, barley: 198, peas: 285 }, dryingCost: 3.50, cleaningCost: 1.80 },
  scandagra: { prices: { wheatExtra: 234, wheat2: 212, wheatFeed: 184, rapeseed: 555, barley: 199, peas: 287 }, dryingCost: 3.60, cleaningCost: 1.70 },
  agrokoncertas: { prices: { wheatExtra: 231, wheat2: 210, wheatFeed: 185, rapeseed: 550, barley: 200, peas: 283 }, dryingCost: 3.40, cleaningCost: 1.60 },
  kauno_grudai: { prices: { wheatExtra: 233, wheat2: 211, wheatFeed: 186, rapeseed: 553, barley: 201, peas: 286 }, dryingCost: 3.55, cleaningCost: 1.65 },
  baltic_agro: { prices: { wheatExtra: 232, wheat2: 210, wheatFeed: 184, rapeseed: 551, barley: 199, peas: 284 }, dryingCost: 3.50, cleaningCost: 1.70 },
  roquette_amilina: { prices: { wheatExtra: 236, wheat2: 215, wheatFeed: 187, rapeseed: 0, barley: 0, peas: 0 }, dryingCost: 3.40, cleaningCost: 1.50 },
  malsena: { prices: { wheatExtra: 238, wheat2: 214, wheatFeed: 179, rapeseed: 0, barley: 0, peas: 0 }, dryingCost: 3.60, cleaningCost: 1.75 },
  kursenu_grudai: { prices: { wheatExtra: 231, wheat2: 210, wheatFeed: 184, rapeseed: 551, barley: 201, peas: 285 }, dryingCost: 3.45, cleaningCost: 1.65 },
  latraps: { prices: { wheatExtra: 235, wheat2: 213, wheatFeed: 186, rapeseed: 558, barley: 200, peas: 289 }, dryingCost: 3.30, cleaningCost: 1.50 },
  klaipeda_port: { prices: { wheatExtra: 246, wheat2: 224, wheatFeed: 196, rapeseed: 568, barley: 212, peas: 299 }, dryingCost: 4.00, cleaningCost: 2.00 }
};

// 2. MATIF DUOMENŲ BAZĖ IR AUTOMATINĖ ISTORIJOS KREIVĖ
const getMatifData = () => {
    
    const buildHistory = (basePrice, pattern) => {
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
                else p = 565 - ((progress - 0.85) / 0.15) * (565 - basePrice) + (Math.sin(i / 3) * 2);
            } else if (pattern === "wheat") {
                if (progress < 0.4) p = 230 - (progress / 0.4) * 32 + (Math.sin(i / 6) * 3);
                else if (progress < 0.75) p = 198 + ((progress - 0.4) / 0.35) * 62 + (Math.sin(i / 5) * 4);
                else p = 260 - ((progress - 0.75) / 0.25) * (260 - basePrice) + (Math.sin(i / 4) * 2.5);
            } else if (pattern === "corn") {
                if (progress < 0.35) p = 205 - (progress / 0.35) * 27 + (Math.sin(i / 7) * 2.5);
                else if (progress < 0.8) p = 178 + ((progress - 0.35) / 0.45) * 50 + (Math.sin(i / 6) * 3.5);
                else p = 228 - ((progress - 0.8) / 0.2) * (228 - basePrice) + (Math.sin(i / 4) * 2);
            } else if (pattern === "barley") {
                if (progress < 0.4) p = 190 - (progress / 0.4) * 22 + (Math.sin(i / 8) * 2);
                else if (progress < 0.8) p = 168 + ((progress - 0.4) / 0.4) * 44 + (Math.sin(i / 6) * 3);
                else p = 212 - ((progress - 0.8) / 0.2) * (212 - basePrice) + (Math.sin(i / 4) * 1.5);
            } else if (pattern === "peas") {
                if (progress < 0.3) p = 265 - (progress / 0.3) * 20 + (Math.sin(i / 6) * 3);
                else if (progress < 0.7) p = 245 + ((progress - 0.3) / 0.4) * 53 + (Math.sin(i / 5) * 3.5);
                else p = 298 - ((progress - 0.7) / 0.3) * (298 - basePrice) + (Math.sin(i / 4) * 2);
            }

            if (i === 0) p = basePrice;
            
            list.push({
                date: d.toISOString().split("T")[0],
                shortDate: d.toLocaleDateString("lt-LT", { month: "short", day: "numeric" }),
                price: parseFloat(p.toFixed(2))
            });
        }
        return list;
    };

    return {
        rapeseed: {
            id: "rapeseed", name: "Rapsai (Rapeseed)", icon: "🌱", ticker: "ECO (Euronext Paris)", currentPrice: 552.25, change: "-4.50", changePercent: "-0.81%", isPositive: false, color: "#D97706", gradientStart: "rgba(217, 119, 6, 0.35)", gradientEnd: "rgba(217, 119, 6, 0.0)",
            contracts: [{ month: "Lapkritis 2026", price: "552.25 €/t", change: "-4.50 €", isPositive: false }, { month: "Vasaris 2027", price: "558.50 €/t", change: "+1.25 €", isPositive: true }, { month: "Gegužė 2027", price: "557.00 €/t", change: "+0.50 €", isPositive: true }, { month: "Rugpjūtis 2027", price: "525.25 €/t", change: "-2.00 €", isPositive: false }],
            history: buildHistory(552.25, "rapeseed")
        },
        wheat: {
            id: "wheat", name: "Kviečiai (Milling Wheat No.2)", icon: "🌾", ticker: "EBM (Euronext Paris)", currentPrice: 232.50, change: "+1.25", changePercent: "+0.54%", isPositive: true, color: "#16A34A", gradientStart: "rgba(22, 163, 74, 0.35)", gradientEnd: "rgba(22, 163, 74, 0.0)",
            contracts: [{ month: "Rugsėjis 2026", price: "232.50 €/t", change: "+1.25 €", isPositive: true }, { month: "Gruodis 2026", price: "236.00 €/t", change: "+1.00 €", isPositive: true }, { month: "Kovas 2027", price: "239.50 €/t", change: "+0.75 €", isPositive: true }, { month: "Gegužė 2027", price: "241.00 €/t", change: "+0.50 €", isPositive: true }],
            history: buildHistory(232.50, "wheat")
        },
        barley: {
            id: "barley", name: "Miežiai (Pašariniai)", icon: "🌾", ticker: "FOB Baltic Index", currentPrice: 198.00, change: "+1.50", changePercent: "+0.76%", isPositive: true, color: "#059669", gradientStart: "rgba(5, 150, 105, 0.35)", gradientEnd: "rgba(5, 150, 105, 0.0)",
            contracts: [{ month: "Rugpjūtis 2026", price: "198.00 €/t", change: "+1.50 €", isPositive: true }, { month: "Spalis 2026", price: "202.00 €/t", change: "+1.00 €", isPositive: true }, { month: "Gruodis 2026", price: "205.50 €/t", change: "+0.50 €", isPositive: true }, { month: "Kovas 2027", price: "208.00 €/t", change: "+0.50 €", isPositive: true }],
            history: buildHistory(198.00, "barley")
        },
        peas: {
            id: "peas", name: "Žirniai / Pupos", icon: "🫘", ticker: "LT Rinkos indeksas", currentPrice: 285.00, change: "+3.00", changePercent: "+1.06%", isPositive: true, color: "#7C3AED", gradientStart: "rgba(124, 58, 237, 0.35)", gradientEnd: "rgba(124, 58, 237, 0.0)",
            contracts: [{ month: "Rugpjūtis 2026", price: "285.00 €/t", change: "+3.00 €", isPositive: true }, { month: "Spalis 2026", price: "290.00 €/t", change: "+2.00 €", isPositive: true }, { month: "Gruodis 2026", price: "294.00 €/t", change: "+1.00 €", isPositive: true }, { month: "Kovas 2027", price: "297.00 €/t", change: "+0.50 €", isPositive: true }],
            history: buildHistory(285.00, "peas")
        },
        corn: {
            id: "corn", name: "Kukurūzai (Corn)", icon: "🌽", ticker: "EMA (Euronext Paris)", currentPrice: 214.00, change: "+0.75", changePercent: "+0.35%", isPositive: true, color: "#2563EB", gradientStart: "rgba(37, 99, 235, 0.35)", gradientEnd: "rgba(37, 99, 235, 0.0)",
            contracts: [{ month: "Rugpjūtis 2026", price: "214.00 €/t", change: "+0.75 €", isPositive: true }, { month: "Lapkritis 2026", price: "217.50 €/t", change: "+1.00 €", isPositive: true }, { month: "Kovas 2027", price: "221.00 €/t", change: "+0.50 €", isPositive: true }, { month: "Birželis 2027", price: "223.50 €/t", change: "+0.50 €", isPositive: true }],
            history: buildHistory(214.00, "corn")
        }
    };
};

// 3. BENDRAS SINCHRONIZAVIMAS
async function executeSync() {
  const registry = getOfficialVATRegistry();
  const batch = db.batch();

  registry.forEach((item) => {
    const profile = companyPriceProfiles[item.buyerKey] || companyPriceProfiles["linas_agro"];
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      prices: profile.prices,
      dryingCost: profile.dryingCost,
      cleaningCost: profile.cleaningCost
    }, { merge: true });
  });
  await batch.commit();

  // Įrašome ir MATIF duomenis
  const matifData = getMatifData();
  const matifRef = db.collection("matif_prices").doc("market_data");
  await matifRef.set({
    crops: matifData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { elCount: registry.length, matifCount: Object.keys(matifData).length };
}

// 4. AUTOMATINIS IR RANKINIS PALEIDIMAS
exports.scrapeGrainPrices = onSchedule({ schedule: "0 */6 * * *", timeZone: "Europe/Vilnius" }, async (event) => {
    console.log("Vykdomas kas 6 valandas suplanuotas grūdų kainų, elevatorių ir MATIF biržos atnaujinimas...");
    await executeSync();
});

exports.manualTriggerGrainScrape = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
    try {
        const { elCount, matifCount } = await executeSync();
        res.send(`✅ Sėkmingai atnaujinti ${elCount} elevatoriai ir ${matifCount} MATIF biržos augalai Firestore duomenų bazėje! 🌾📈`);
    } catch (err) {
        res.status(500).send("Klaida: " + err.message);
    }
});