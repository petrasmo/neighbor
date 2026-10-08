// functions/notificationsHelper.js
const axios = require("axios");

const GEE_URL = "https://us-central1-neighborpm-b9968.cloudfunctions.net/calculate-field-ndvi-gee";

/**
 * 1. MATIF KAINŲ ŠUOLIAI (virš ±2%)
 */
async function checkAndSendMatifAlerts(db, admin, crops) {
    if (!crops) return;
    const thresholdPercent = 2.0;
    const alertMessages = [];

    for (const [key, crop] of Object.entries(crops)) {
        const rawChange = parseFloat((crop.changePercent || "0").replace("%", "").replace("+", ""));
        if (Math.abs(rawChange) >= thresholdPercent) {
            const isUp = rawChange > 0;
            const icon = isUp ? "🟢" : "🔴";
            const trendIcon = isUp ? "📈" : "📉";
            const sign = isUp ? "+" : "";

            alertMessages.push({
                title: `${icon} MATIF: ${crop.name.split(' ')[0]} ${sign}${rawChange.toFixed(1)}% ${trendIcon}`,
                body: `Kaina biržoje: ${crop.currentPrice.toFixed(2)} €/t. Pokytis: ${crop.change}.`
            });
        }
    }
    if (alertMessages.length > 0) await sendToSubscribers(db, admin, "matifPrice", alertMessages);
}

/**
 * 2. GAZOLIO KAINŲ KRITIMAS/PAKILIMAS (>2%)
 */
async function checkAndSendDieselAlerts(db, admin, dieselDataArray) {
    if (!dieselDataArray || dieselDataArray.length === 0) return;

    let sumPrice = 0;
    dieselDataArray.forEach(d => { sumPrice += (d.basePriceNoVat || 0.85); });
    const todayAvg = sumPrice / dieselDataArray.length;

    const stateRef = db.collection("system_state").doc("diesel_tracker");
    const stateDoc = await stateRef.get();
    
    let yesterdayAvg = stateDoc.exists ? stateDoc.data().lastAvgPrice : todayAvg;
    const changePercent = ((todayAvg - yesterdayAvg) / yesterdayAvg) * 100;

    await stateRef.set({ 
        lastAvgPrice: todayAvg,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    if (Math.abs(changePercent) >= 2.0) {
        const isUp = changePercent > 0;
        await sendToSubscribers(db, admin, "dieselDrop", [{
            title: `⛽ Gazolio kainos pokytis ${isUp ? '📈' : '📉'} (${changePercent.toFixed(1)}%)`,
            body: `Didmeninė kaina bazėse ${isUp ? 'pakilo' : 'nukrito'}. Patikrinkite kainas!`
        }]);
    }
}

/**
 * 3. NMA TERMINŲ PRIMINIKLIS (likus 5 d.)
 */
async function checkAndSendNmaAlerts(db, admin) {
    const doc = await db.collection("nma_regulations").doc("current_season").get();
    const regs = doc.exists ? doc.data() : { manureBanStart: "2026-11-15", manureBanEnd: "2026-03-20", coverCropWinterEnd: "2026-01-15" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alertMessages = [];
    const checkDays = (dStr, name) => {
        const d = new Date(dStr); d.setHours(0,0,0,0);
        if (Math.round((d - today) / (1000 * 60 * 60 * 24)) === 5) {
            alertMessages.push({ title: `⚠️ NMA Priminimas: Liko 5 dienos!`, body: `${name} terminas: ${dStr}.` });
        }
    };
    checkDays(regs.manureBanStart, "Mėšlo skleidimo draudimo pradžia");
    checkDays(regs.manureBanEnd, "Mėšlo skleidimo draudimo pabaiga");
    if (alertMessages.length > 0) await sendToSubscribers(db, admin, "nmaDeadlines", alertMessages);
}

/**
 * 4. ŽIEMKENČIŲ PAVOJUS (Šaltis, Antarktida, Plikšalis, Pelėsis, Ledo pluta)
 */
async function checkAndSendWinterDanger(db, admin, user, fieldData) {
    if (!user.notificationPreferences?.winterDanger) return;

    let alertTitle = "";
    let alertBody = "";

    if (fieldData.airTemp <= -12.0 || fieldData.soilTemp <= -8.0) {
        alertTitle = `🚨 ŽIEMKENČIŲ PAVOJUS: „${fieldData.name}“!`;
        alertBody = `Užfiksuotas kritinis šaltis: oras ${fieldData.airTemp}°C, dirva ${fieldData.soilTemp}°C! Gresia pasėlių žūtis.`;
    } else if (fieldData.isIceRisk) {
        alertTitle = `🔴 Ledo plutos pavojus: „${fieldData.name}“`;
        alertBody = `Lauke susidarė ledo pluta, gresia pasėlių uždusimas!`;
    } else if (fieldData.moldDays >= 45) {
        alertTitle = `⚠️ Sniego pelėsio rizika: „${fieldData.name}“`;
        alertBody = `Sniegas stovi per ilgai ant neatšalusios dirvos, didėja pelėsio grėsmė.`;
    }

    if (alertTitle) {
        await sendToSubscribers(db, admin, "winterDanger", [{ title: alertTitle, body: alertBody }], [user.userId]);
    }
}

/**
 * 5. T-SUM STARTAS (Pavasario vegetacija)
 */
async function checkAndSendTsumAlert(db, admin, user, fieldData) {
    if (!user.notificationPreferences?.tSumStart) return;

    const target = (fieldData.crop || "").toLowerCase().includes("raps") ? 250 : 200;
    if (fieldData.currentSum >= target && fieldData.currentSum < (target + 15)) {
        await sendToSubscribers(db, admin, "tSumStart", [{ 
            title: `🌱 Pavasario vegetacijos startas: „${fieldData.name}“`, 
            body: `Pasiekta N1 tręšimo riba (${Math.round(fieldData.currentSum)}°C)! Laikas pirmajam salietros tręšimui.` 
        }], [user.userId]);
    }
}

/**
 * 6. KRUŠOS PAVOJUS
 */
async function checkAndSendHailAlerts(db, admin, user, weatherCode) {
    if ((weatherCode === 96 || weatherCode === 99) && user.notificationPreferences?.hailWarning) {
        await sendToSubscribers(db, admin, "hailWarning", [{ 
            title: "🧊 KRUŠOS PAVOJUS!", 
            body: "Prognozuojama kruša jūsų ūkio zonoje. Apsaugokite techniką ir automobilius!" 
        }], [user.userId]);
    }
}

/**
 * 🌟 7. SENTINEL-2 PRASKRIDIMAS VIRŠ GARAŽO (Pagal ūkio bazės koordinates)
 * Tikrina GEE, siunčia pranešimą VISADA, kai praskrido, nurodydama debesuotumo %
 */
async function checkAndSendGarageSatPass(db, admin) {
    console.log("🛰️ Vykdomas ūkio bazių (garažų) Sentinel-2 praskridimo patikrinimas...");

    const usersSnap = await db.collection("users").get();

    for (const uDoc of usersSnap.docs) {
        const user = uDoc.data();
        user.userId = user.userId || uDoc.id;
        const prefs = user.notificationPreferences || {};

        if (prefs.enabled === false || prefs.satPass !== true) continue;
        if (!user.garageLat || !user.garageLon || user.garageLat === 0) continue;

        try {
            // Kreipiamės į mūsų GEE debesies funkciją su garažo koordinatėmis
            const response = await axios.post(GEE_URL, {
                coords: [{ lat: user.garageLat, lng: user.garageLon }]
            }, { timeout: 15000 });

            const data = response.data;
            if (!data || !data.success) continue;

            const satDate = data.satDate || "Šiandien";
            const cloudCover = data.cloudCover ?? 0;

            // Apsauga nuo dubliavimo šiandienai
            const trackerRef = db.collection("system_state").doc(`garage_sat_${user.userId}_${satDate}`);
            const trackerDoc = await trackerRef.get();
            if (trackerDoc.exists) continue;

            // Pranešimo tekstas priklausomai nuo debesuotumo
            let cloudText = `Dangus giedras (debesuotumas: ${cloudCover}%). Atnaujintas NDVI!`;
            if (cloudCover > 50) {
                cloudText = `Debesuotumas: ${cloudCover}% (Dangus trauktas, palydovas laukų nematė).`;
            } else if (cloudCover > 20) {
                cloudText = `Debesuotumas: ${cloudCover}% (Dalinis debesuotumas).`;
            }

            const title = `🛰️ Sentinel-2 praskrido virš ūkio bazės!`;
            const body = `Kadras: ${satDate}. ${cloudText}`;

            const tokens = user.fcmTokens || (user.fcmToken ? [user.fcmToken] : []);
            if (tokens.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    tokens: tokens,
                    notification: { title, body },
                    data: { title, body },
                    webpush: {
                        notification: {
                            title,
                            body,
                            icon: "https://jurgisagro.com/logo.png",
                            badge: "https://jurgisagro.com/logo.png"
                        }
                    }
                });
                console.log(`✅ Pranešimas išsiųstas vartotojui ${user.name} apie kadrą ${satDate} (${cloudCover}% debesų).`);
            }

            await trackerRef.set({
                notifiedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        } catch (err) {
            console.warn(`Klaida tikrinant garažo palydovą vartotojui ${user.name}:`, err.message);
        }
    }
}

/**
 * 🌟 8. BENDROSIOS LAUKŲ, ORŲ IR PALYDOVŲ STEBĖSENOS VARIKLIS
 */
async function checkAndSendFieldAndWeatherAlerts(db, admin) {
    console.log("🌾 Vykdomas visų ūkio laukų ir orų skenavimas...");

    // 1. Patikriname palydovo praskridimus virš ūkio bazių (garažų)
    await checkAndSendGarageSatPass(db, admin);

    // 2. Toliau tikriname orų pavojus laukuose
    const usersSnap = await db.collection("users").get();

    for (const uDoc of usersSnap.docs) {
        const user = uDoc.data();
        user.userId = user.userId || uDoc.id;
        const prefs = user.notificationPreferences || {};
        if (prefs.enabled === false) continue;

        const fieldsSnap = await db.collection("user_fields").where("userId", "==", user.userId).get();

        for (const fDoc of fieldsSnap.docs) {
            const field = fDoc.data();
            field.id = field.id || fDoc.id;
            const coords = field.polygonCoordinates || [];
            if (coords.length < 3) continue;

            const lat = Array.isArray(coords[0]) ? parseFloat(coords[0][0]) : parseFloat(coords[0].lat);
            const lng = Array.isArray(coords[0]) ? parseFloat(coords[0][1]) : parseFloat(coords[0].lng);

            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,soil_temperature_6cm,weather_code&hourly=snow_depth,soil_temperature_6cm,temperature_2m&timezone=auto`;
                const wRes = await axios.get(url, { timeout: 6000 });
                const current = wRes.data?.current || {};
                const hourly = wRes.data?.hourly || {};

                const airTemp = current.temperature_2m ?? 0;
                const soilTemp = current.soil_temperature_6cm ?? 0;
                const weatherCode = current.weather_code ?? 0;

                const rawSnow = hourly.snow_depth?.[0] || 0;
                const snowCm = Math.round(rawSnow * 100);

                let sumTemp = 0;
                const temps = hourly.temperature_2m || [];
                temps.forEach(t => { if (t > 0) sumTemp += (t / 24); });

                const fieldData = {
                    name: field.name,
                    crop: field.crop,
                    airTemp: airTemp,
                    soilTemp: soilTemp,
                    snowCm: snowCm,
                    currentSum: sumTemp,
                    isIceRisk: (soilTemp < 0 && snowCm > 2),
                    moldDays: (snowCm >= 10 && soilTemp >= -1.0) ? 50 : 5
                };

                await checkAndSendWinterDanger(db, admin, user, fieldData);
                await checkAndSendHailAlerts(db, admin, user, weatherCode);
                await checkAndSendTsumAlert(db, admin, user, fieldData);

            } catch (err) {
                console.warn(`Nepavyko gauti orų laukui ${field.name}:`, err.message);
            }
        }
    }
}

/**
 * 🌟 BENDRA SIUNTIMO FUNKCIJA
 */
async function sendToSubscribers(db, admin, topicKey, messagesArray, userIds = null) {
    let usersSnap;
    if (userIds) {
        const refs = userIds.map(id => db.collection("users").doc(id));
        usersSnap = await db.getAll(...refs);
    } else {
        usersSnap = await db.collection("users").get();
    }

    const targetTokens = [];
    usersSnap.forEach(doc => {
        const data = doc.data ? doc.data() : doc;
        const prefs = data.notificationPreferences || {};
        
        if (prefs.enabled !== false && prefs[topicKey] === true) {
            const tokens = data.fcmTokens || (data.fcmToken ? [data.fcmToken] : []);
            tokens.forEach(t => { if (t && !targetTokens.includes(t)) targetTokens.push(t); });
        }
    });

    if (targetTokens.length === 0) return;

    for (const msg of messagesArray) {
        try {
            await admin.messaging().sendEachForMulticast({
                tokens: targetTokens,
                notification: {
                    title: msg.title,
                    body: msg.body
                },
                data: { 
                    title: msg.title, 
                    body: msg.body 
                },
                webpush: {
                    notification: {
                        title: msg.title,
                        body: msg.body,
                        icon: "https://jurgisagro.com/logo.png",
                        badge: "https://jurgisagro.com/logo.png",
                        vibrate: [300, 100, 300, 100, 300]
                    },
                    fcmOptions: {
                        link: "https://jurgisagro.com/"
                    }
                }
            });
        } catch (err) {
            console.error(`❌ FCM klaida [${topicKey}]:`, err);
        }
    }
}

module.exports = { 
    checkAndSendMatifAlerts, 
    checkAndSendDieselAlerts, 
    checkAndSendNmaAlerts, 
    checkAndSendWinterDanger, 
    checkAndSendTsumAlert, 
    checkAndSendHailAlerts, 
    checkAndSendGarageSatPass,
    checkAndSendFieldAndWeatherAlerts
};