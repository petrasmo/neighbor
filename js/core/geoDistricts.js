// js/core/geoDistricts.js

/**
 * Pagal GPS koordinates dinamiškai nustato tikslų Lietuvos rajoną
 * JOKIOS STATIKOS: jei nepavyksta nustatyti – grąžina null.
 */
export async function getDistrictFromCoords(lat, lng) {
    if (!lat || !lng) return null;

    try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=lt`;
        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();

        // Ieškome oficialaus savivaldybės / rajono lygio
        const adminLevels = data.localityInfo?.administrative || [];
        let districtName = "";

        for (const admin of adminLevels) {
            const name = admin.name || "";
            if (name.includes("savivaldybė") || name.includes("rajono")) {
                districtName = name;
                break;
            }
        }

        if (!districtName && data.adminDistrict) {
            districtName = data.adminDistrict;
        }

        if (districtName) {
            return districtName
                .replace(/ rajono savivaldybė/gi, " r.")
                .replace(/ rajono/gi, " r.")
                .replace(/ savivaldybė/gi, " sav.")
                .trim();
        }

        return null;
    } catch (err) {
        console.warn("Nepavyko nustatyti rajono pagal GPS:", err.message);
        return null; // Jokio spėliojimo – tiesiog null
    }
}