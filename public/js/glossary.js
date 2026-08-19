// js/glossary.js
import { createSearchFilter } from './components/searchFilter.js';

const PAGE_SIZE = 20;

let allTerms = [];
let searchQuery = "";
let selectedCategory = "Visi";
let expandedTermIds = new Set();
let visibleCount = PAGE_SIZE;
let scrollObserver = null;

export async function renderGlossaryScreen(container, onBack) {
    if (allTerms.length === 0) {
        try {
            const res = await fetch('/assets/zodynas_lt.json');
            allTerms = await res.json();
        } catch (e) {
            console.error("Klaida nuskaitant žodyną:", e);
        }
    }

    visibleCount = PAGE_SIZE;
    renderGlossaryLayout(container, onBack);
}

function getFilteredTerms() {
    return allTerms.filter(item => {
        const matchesCategory = selectedCategory === "Visi" || item.category === selectedCategory;
        const matchesSearch = searchQuery === "" ||
            item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.explanation.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
}

function renderGlossaryLayout(container, onBack) {
    const categories = ["Visi", ...Array.from(new Set(allTerms.map(t => t.category)))];

    container.innerHTML = `
        <div class="space-y-4 max-w-4xl mx-auto py-2">
            
            <!-- Viršutinė juosta -->
            <div class="flex items-center gap-3 border-b border-forestBorder pb-3">
                <button id="glossary-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none">
                    ←
                </button>
                <div>
                    <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Medžiotojų žodynas</h2>
                    <p id="glossary-count-info" class="text-[11px] text-forestSecondary">Kraunama...</p>
                </div>
            </div>

            <!-- BENDRAS PAIEŠKOS IR FILTRŲ KOMPONENTAS -->
            <div id="glossary-filter-component"></div>

            <!-- Žodyno terminų sąrašas -->
            <div id="glossary-list-container" class="space-y-2.5 pt-1"></div>

            <!-- Begalinio slinkimo žymeklis (Sentinel) -->
            <div id="glossary-sentinel" class="h-10 flex items-center justify-center py-4"></div>
        </div>
    `;

    document.getElementById('glossary-back-btn')?.addEventListener('click', onBack);

    // INICIALIZUOJAME BENDRĄ KOMPONENTĄ
    createSearchFilter({
        container: document.getElementById('glossary-filter-component'),
        placeholder: "Ieškoti termino arba reikšmės (pvz., ožys, šūvis, laika)...",
        categories: categories,
        initialCategory: selectedCategory,
        onFilterChange: ({ query, category }) => {
            searchQuery = query;
            selectedCategory = category;
            visibleCount = PAGE_SIZE;
            updateGlossaryList();
        }
    });

    updateGlossaryList();
    setupInfiniteScroll();
}

function updateGlossaryList() {
    const listContainer = document.getElementById('glossary-list-container');
    const countInfo = document.getElementById('glossary-count-info');
    if (!listContainer) return;

    const filtered = getFilteredTerms();
    if (countInfo) countInfo.innerText = `Rasta terminų: ${filtered.length}`;

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-2">
                <span class="text-3xl block">🔍</span>
                <p class="text-sm font-bold text-white">Terminų pagal užklausą nerasta</p>
                <p class="text-xs text-forestSecondary">Pakeiskite paieškos žodį arba kategoriją.</p>
            </div>
        `;
        return;
    }

    const currentBatch = filtered.slice(0, visibleCount);
    listContainer.innerHTML = currentBatch.map(createTermCardHtml).join('');
    attachCardEvents();
}

function createTermCardHtml(item) {
    const isExpanded = expandedTermIds.has(item.id);
    const titleColor = isExpanded ? 'text-forestPrimary' : 'text-white';
    
    let expandedHtml = "";
    if (isExpanded) {
        const example = item.exampleSentence 
            ? `<p class="text-forestPrimary italic">Pavyzdys: „${item.exampleSentence}“</p>` 
            : "";
        expandedHtml = `
            <div class="mt-3 pt-3 border-t border-forestBorder/70 space-y-2 text-xs leading-relaxed">
                <p class="text-forestSecondary">${item.explanation}</p>
                ${example}
            </div>
        `;
    }

    return `
        <div class="glossary-term-card bg-forestSurface border border-forestBorder hover:border-forestPrimary/60 rounded-xl p-4 transition duration-200 cursor-pointer select-none" data-id="${item.id}">
            <div class="flex justify-between items-center gap-3">
                <h4 class="text-sm md:text-base font-bold ${titleColor} transition">
                    ${item.term}
                </h4>
                <span class="text-[10px] font-bold text-forestSecondary bg-forestBackground px-2.5 py-1 rounded-md border border-forestBorder whitespace-nowrap">
                    ${item.category}
                </span>
            </div>
            ${expandedHtml}
        </div>
    `;
}

function attachCardEvents() {
    document.querySelectorAll('.glossary-term-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.getAttribute('data-id'));
            if (expandedTermIds.has(id)) {
                expandedTermIds.delete(id);
            } else {
                expandedTermIds.add(id);
            }
            updateGlossaryList();
        });
    });
}

function setupInfiniteScroll() {
    if (scrollObserver) scrollObserver.disconnect();

    const sentinel = document.getElementById('glossary-sentinel');
    if (!sentinel) return;

    scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            const filtered = getFilteredTerms();
            if (visibleCount < filtered.length) {
                visibleCount += PAGE_SIZE;
                updateGlossaryList();
            }
        }
    }, { rootMargin: '100px' });

    scrollObserver.observe(sentinel);
}