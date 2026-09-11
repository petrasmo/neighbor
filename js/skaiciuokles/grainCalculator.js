// js/grainCalculator.js

/**
 * Haversine formulė atstumui tarp dviejų GPS taškų (km)
 */
export function calculateDist(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

/**
 * Apskaičiuoja elevatorių pelningumą kroviniui (su ir be transporto)
 */
export function calculateBuyerRanking(activeMarketData, params, userGarageCoords) {
    const { crop, weight, moisture, impurities, includeTransport, transportRatePerTonKm } = params;
    const baseMoisture = 14.0;
    const baseImpurities = 2.0;

    return activeMarketData
        .map(buyer => {
            const basePrice = buyer.prices ? (buyer.prices[crop] || 0) : 0;
            if (basePrice === 0) return null; // Neperka šios kultūros

            let distKm = 0;
            if (userGarageCoords && buyer.lat && buyer.lng) {
                distKm = Math.round(calculateDist(userGarageCoords.lat, userGarageCoords.lng, buyer.lat, buyer.lng));
            }

            // 1. Svorio nuoskaitos (Drėgmė + Šiukšlės)
            let moistureLossPercent = 0;
            if (moisture > baseMoisture) {
                moistureLossPercent = ((moisture - baseMoisture) / (100 - baseMoisture)) * 100;
            }

            let impurityLossPercent = 0;
            if (impurities > baseImpurities) {
                impurityLossPercent = (impurities - baseImpurities);
            }

            const totalLossPercent = moistureLossPercent + impurityLossPercent;
            const weightLossTons = (weight * totalLossPercent) / 100;
            const finalWeightTons = Math.max(0, weight - weightLossTons);

            // 2. Elevatoriaus paslaugos (Džiovinimas + Valymas)
            const excessMoisture = Math.max(0, moisture - baseMoisture);
            const excessImpurities = Math.max(0, impurities - baseImpurities);

            const dryingRate = buyer.dryingCost || 3.50;
            const cleaningRate = buyer.cleaningCost || 1.70;

            const dryingCost = weight * excessMoisture * dryingRate;
            const cleaningCost = weight * excessImpurities * cleaningRate;
            const totalElevatorFees = dryingCost + cleaningCost;

            // 3. Išmokėjimas ELEVATORIUJE (BE TRANSPORTO)
            const grossPayout = finalWeightTons * basePrice;
            const elevatorPayoutNoTransport = Math.max(0, grossPayout - totalElevatorFees);
            const effectivePriceNoTransport = weight > 0 ? (elevatorPayoutNoTransport / weight) : 0;

            // 4. Transporto logistika
            let transportCost = 0;
            if (includeTransport && distKm > 0) {
                transportCost = weight * distKm * transportRatePerTonKm;
            }

            // 5. Grynasis pelnas Į KIŠENĘ (SU TRANSPORTO ĮVERTINIMU)
            const finalPocketProfit = Math.max(0, elevatorPayoutNoTransport - transportCost);
            const effectivePriceWithTransport = weight > 0 ? (finalPocketProfit / weight) : 0;

            return {
                ...buyer,
                distKm,
                basePrice,
                finalWeightTons,
                weightLossTons,
                totalElevatorFees,
                transportCost,
                elevatorPayoutNoTransport,       // 👈 Kaina elevatoriuje be transporto
                effectivePriceNoTransport,       // 👈 Faktinė kaina/t be transporto
                finalPocketProfit,               // 👈 Galutinis pelnas su transportu
                effectivePriceWithTransport      // 👈 Faktinė kaina/t su transportu
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.finalPocketProfit - a.finalPocketProfit);
}