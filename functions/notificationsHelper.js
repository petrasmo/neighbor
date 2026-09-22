// functions/notificationsHelper.js

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
 * 3. NMA TERMINŲ PRIMINIKLIS
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
 * 4. ŽIEMKENČIŲ PAVOJUS (Plikšalis, Pelėsis, Ledo pluta)
 */
async function checkAndSendWinterDanger(db, admin, user, fieldData) {
    if (!user.notificationPreferences?.winterDanger) return;

    let alertTitle = "";
    let alertBody = "";
    if (fieldData.isIceRisk) {
        alertTitle = "🔴 Ledo plutos pavojus";
        alertBody = `Lauke „${fieldData.name}“ susidarė ledo pluta, gresia pasėlių uždusimas!`;
    } else if (fieldData.moldDays >= 45) {
        alertTitle = "⚠️ Sniego pelėsio rizika";
        alertBody = `Lauke „${fieldData.name}“ sniegas stovi per ilgai, didėja pelėsio grėsmė.`;
    }

    if (alertTitle) {
        await sendToSubscribers(db, admin, "winterDanger", [{ title: alertTitle, body: alertBody }], [user.userId]);
    }
}

/**
 * 5. T-SUM STARTAS (Pavasario vegetacija)
 */
async function checkAndSendTsumAlert(db, admin, user, fieldData) {
    if (user.notificationPreferences?.tSumStart && fieldData.currentSum >= fieldData.targetTemp) {
        await sendToSubscribers(db, admin, "tSumStart", [{ 
            title: "🌱 Pavasario vegetacijos startas", 
            body: `Lauke „${fieldData.name}“ pasiekta N1 tręšimo riba (${fieldData.currentSum}°C)!` 
        }], [user.userId]);
    }
}

/**
 * 6. KRUŠOS PAVOJUS
 */
async function checkAndSendHailAlerts(db, admin, user, weatherCode) {
    if ((weatherCode === 96 || weatherCode === 99) && user.notificationPreferences?.hailWarning) {
        await sendToSubscribers(db, admin, "hailWarning", [{ title: "🧊 KRUŠOS PAVOJUS!", body: "Prognozuojama kruša ūkio bazėje. Apsaugokite techniką!" }], [user.userId]);
    }
}

/**
 * 7. SENTINEL PALYDOVO KADRAS
 */
async function checkAndSendSatAlert(db, admin, userId, fieldName) {
    await sendToSubscribers(db, admin, "satPass", [{ title: "🛰️ Naujas palydovo kadras", body: `Lauke „${fieldName}“ atnaujinti NDVI duomenys.` }], [userId]);
}

/**
 * BENDRA FUNKCIJA (IŠSIUNTIMAS)
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
                data: { title: msg.title, body: msg.body }
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
    checkAndSendSatAlert 
};