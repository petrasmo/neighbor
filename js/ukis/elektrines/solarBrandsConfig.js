// js/ukis/elektrines/solarBrandsConfig.js

export const SOLAR_BRANDS = {
    growatt: {
        id: 'growatt',
        name: 'Growatt',
        cloudLabel: 'Growatt Cloud',
        badgeText: '🟢 Growatt Cloud',
        defaultServerUri: 'https://openapi.growatt.com',
        tokenLabel: 'Growatt OpenAPI Token *',
        tokenPlaceholder: 'Įklijuokite savo Growatt OpenAPI raktą...',
        helpText: '☀️ Sistema automatiškai nuskaitys <strong>visas</strong> jūsų Growatt paskyroje esančias saulės elektrines ir inverterius!',
        supportsBattery: false
    },
    foxess: {
        id: 'foxess',
        name: 'FoxESS',
        cloudLabel: 'FoxESS Cloud',
        badgeText: '🟢 FoxESS Cloud',
        defaultServerUri: 'https://www.foxesscloud.com',
        tokenLabel: 'FoxESS Open API Key *',
        tokenPlaceholder: 'Įklijuokite API raktą iš foxesscloud.com -> User Profile -> API Management',
        helpText: '🔋 Prisijunkite prie <em>foxesscloud.com</em> -> <strong>User Profile -> API Management -> Generate API Key</strong>. Automatiškai nuskaitys hibridinį inverterį, 3 MPPT stringus, baterijos būseną ir aktyvuos Nord Pool valdymą!',
        supportsBattery: true
    }
};

export function getSolarBrandMeta(brandId) {
    return SOLAR_BRANDS[brandId] || SOLAR_BRANDS.growatt;
}