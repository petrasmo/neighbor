// public/js/components/searchFilter.js

/**
 * Universalus paieškos ir kategorijų filtrų komponentas
 * @param {HTMLElement} container - DOM elementas, į kurį bus įstatytas komponentas
 * @param {string} placeholder - Paieškos lauko tekstas
 * @param {Array<string>} categories - Kategorijų sąrašas (pvz., ["Visi", "Paukščiai", ...])
 * @param {string} initialCategory - Pradinė aktyvi kategorija (numatytoji: "Visi")
 * @param {Function} onFilterChange - Callback funkcija, iškviečiama pasikeitus paieškai ar kategorijai: ({ query, category }) => void
 */
export function createSearchFilter({
    container,
    placeholder = "Ieškoti...",
    categories = ["Visi"],
    initialCategory = "Visi",
    onFilterChange
}) {
    if (!container) return;

    let currentQuery = "";
    let currentCategory = initialCategory;

    const categoryChipsHtml = categories.map(cat => {
        const isSelected = currentCategory === cat;
        const btnClass = isSelected 
            ? "bg-forestPrimary text-white border-forestPrimary shadow-md" 
            : "bg-forestSurface text-forestSecondary border-forestBorder hover:border-forestPrimary";
        return `
            <button type="button" class="filter-chip-btn px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer select-none ${btnClass}" data-cat="${cat}">
                ${cat}
            </button>
        `;
    }).join('');

    container.innerHTML = `
        <div class="space-y-3 w-full">
            <!-- Paieškos laukelis -->
            <div class="relative">
                <input type="text" class="search-filter-input w-full h-11 bg-forestSurface border border-forestBorder focus:border-forestPrimary rounded-xl px-4 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none transition" 
                    placeholder="${placeholder}" value="${currentQuery}">
                <span class="absolute left-3.5 top-3.5 text-xs text-slate-500 pointer-events-none">🔍</span>
                <button type="button" class="search-filter-clear absolute right-3.5 top-3 text-xs text-slate-400 hover:text-white hidden cursor-pointer">✕</button>
            </div>

            <!-- Kategorijų filtrai su flex-wrap (kelios eilutės) -->
            <div class="filter-chips-container flex flex-wrap gap-2 pt-0.5">
                ${categoryChipsHtml}
            </div>
        </div>
    `;

    const inputElem = container.querySelector('.search-filter-input');
    const clearElem = container.querySelector('.search-filter-clear');
    const chipBtns = container.querySelectorAll('.filter-chip-btn');

    // Paieškos įvesties įvykis (tik atnaujina reikšmę, NENAUDOJA innerHTML ir neperkelia žymeklio)
    inputElem.addEventListener('input', (e) => {
        currentQuery = e.target.value.toLowerCase().trim();
        clearElem.classList.toggle('hidden', currentQuery === "");
        if (onFilterChange) {
            onFilterChange({ query: currentQuery, category: currentCategory });
        }
    });

    // Išvalymo mygtukas
    clearElem.addEventListener('click', () => {
        currentQuery = "";
        inputElem.value = "";
        clearElem.classList.add('hidden');
        inputElem.focus();
        if (onFilterChange) {
            onFilterChange({ query: currentQuery, category: currentCategory });
        }
    });

    // Kategorijų paspaudimai
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.getAttribute('data-cat');
            
            // Atnaujiname mygtukų stilių be viso ekrano perpiešimo
            chipBtns.forEach(b => {
                b.className = "filter-chip-btn px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer select-none bg-forestSurface text-forestSecondary border-forestBorder hover:border-forestPrimary";
            });
            btn.className = "filter-chip-btn px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer select-none bg-forestPrimary text-white border-forestPrimary shadow-md";

            if (onFilterChange) {
                onFilterChange({ query: currentQuery, category: currentCategory });
            }
        });
    });
}