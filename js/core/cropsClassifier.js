// js/core/cropsClassifier.js
import { db } from './firebase.js';

let cachedCrops = [];

// Numatytoji atsarga, jei internetas vėluotų
const FALLBACK_CROPS = [
    { id: "wheat_winter", name: { lt: "Žieminiai kviečiai" }, icon: "🌾", nmaGroup: "Žieminiai javai" },
    { id: "rape_winter", name: { lt: "Žieminiai rapsai" }, icon: "🌱", nmaGroup: "Rapsai" },
    { id: "barley_spring", name: { lt: "Vasariniai miežiai" }, icon: "🌾", nmaGroup: "Vasariniai javai" },
    { id: "wheat_spring", name: { lt: "Vasariniai kviečiai" }, icon: "🌾", nmaGroup: "Vasariniai javai" },
    { id: "oats", name: { lt: "Sėjamosios avižos" }, icon: "🌾", nmaGroup: "Avižos" },
    { id: "peas_beans", name: { lt: "Žirniai / Pupos" }, icon: "🫘", nmaGroup: "Ankštiniai javai" },
    { id: "corn", name: { lt: "Kukurūzai" }, icon: "🌽", nmaGroup: "Kukurūzai" },
    { id: "fallow_black", name: { lt: "Nėra pasėlio (Arimas / Pūdymas)" }, icon: "🚜", nmaGroup: "Pūdymas" },
    { id: "grassland", name: { lt: "Pievos ir ganyklos" }, icon: "🍀", nmaGroup: "Ganyklos-pievos iki 5 m." },
    { id: "other_crops", name: { lt: "Kita / Nenurodyta" }, icon: "⚪", nmaGroup: "Kita ariama žemė" }
];

// Užkrauna visą klasifikatorių iš Firestore
export async function loadCropsClassifier() {
    if (cachedCrops.length > 0) return cachedCrops;

    try {
        const snap = await db.collection("crops_classifier").get();
        if (!snap.empty) {
            cachedCrops = [];
            snap.forEach(doc => cachedCrops.push(doc.data()));
        } else {
            cachedCrops = FALLBACK_CROPS;
        }
    } catch (e) {
        console.warn("Klasifikatoriaus krovimo klaida, naudojama atsarga:", e);
        cachedCrops = FALLBACK_CROPS;
    }

    return cachedCrops;
}

// 🌟 MAGIJA: Pagal NMA grupę suranda tinkamą portalo kultūrą
export function findCropByNmaGroup(nmaGroup) {
    if (!nmaGroup) return null;
    const clean = nmaGroup.trim();

    // 1. Tiesioginis sutapimas pagal nmaGroup lauką
    const directMatch = cachedCrops.find(c => c.nmaGroup === clean);
    if (directMatch) return directMatch;

    // 2. Papildomas atpažinimas pagal fragmentus
    const lower = clean.toLowerCase();
    if (lower.includes("žiemin") || lower.includes("javai")) {
        return cachedCrops.find(c => c.id === "wheat_winter");
    }
    if (lower.includes("raps")) {
        return cachedCrops.find(c => c.id === "rape_winter");
    }
    if (lower.includes("ankštin") || lower.includes("žirn") || lower.includes("pup")) {
        return cachedCrops.find(c => c.id === "peas_beans");
    }
    if (lower.includes("pūdym") || lower.includes("ariama")) {
        return cachedCrops.find(c => c.id === "fallow_black");
    }

    return cachedCrops.find(c => c.id === "other_crops") || cachedCrops[0];
}

export function getAllCrops() {
    return cachedCrops.length > 0 ? cachedCrops : FALLBACK_CROPS;
}