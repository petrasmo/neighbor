// js/seasons.js
import { createSearchFilter } from './components/searchFilter.js';

let seasonsData = [];
let searchQuery = "";
let selectedCategory = "Visi";

const MONTH_NAMES = [
    'Sausio', 'Vasario', 'Kovo', 'Balandžio', 'Gegužės', 'Birželio',
    'Liepos', 'Rugpjūčio', 'Rugsėjo', 'Spalio', 'Lapkričio', 'Gruodžio'
];

export async function renderSeasonsScreen(container, onBack) {
    if (seasonsData.length === 0) {
        try {
            const res = await fetch('/assets/medziokles_terminai_lt.json');
            seasonsData = await res.json();
        } catch (e) {
            console.error("Klaida nuskaitant terminus:", e);
        }
    }

    renderLayout(container, onBack);
}

function checkStatus(item, today) {
    if (item.allYear) return { isOpen: true, isAllYear: true, daysText: "Neribojama" };

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    let startDate, endDate;

    if (item.startMonth > item.endMonth) {
        if (currentMonth >= item.startMonth) {
            startDate = new Date(currentYear, item.startMonth - 1, item.startDay);
            endDate = new Date(currentYear + 1, item.endMonth - 1, item.endDay, 23, 59, 59);
        } else {
            startDate = new Date(currentYear - 1, item.startMonth - 1, item.startDay);
            endDate = new Date(currentYear, item.endMonth - 1, item.endDay, 23, 59, 59);
        }
    } else {
        startDate = new Date(currentYear, item.startMonth - 1, item.startDay);
        endDate = new Date(currentYear, item.endMonth - 1, item.endDay, 23, 59, 59);
    }

    const isOpen = (today >= startDate && today <= endDate);
    if (isOpen) {
        const diffTime = endDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { isOpen: true, isAllYear: false, daysText: `Liko ${daysLeft} d. (iki ${MONTH_NAMES[item.endMonth - 1]} ${item.endDay} d.)` };
    } else {
        let nextStart = new Date(currentYear, item.startMonth - 1, item.startDay);
        if (today > nextStart) nextStart = new Date(currentYear + 1, item.startMonth - 1, item.startDay);
        const diffTime = nextStart - today;
        const daysToStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { isOpen: false, isAllYear: false, daysText: `Prasidės po ${daysToStart} d. (${MONTH_NAMES[item.startMonth - 1]} ${item.startDay} d.)` };
    }
}

function renderLayout(container, onBack) {
    const rawCategories = Array.from(new Set(seasonsData.map(i => i.category).filter(Boolean)));
    const categories = ["Visi", "🟢 Leidžiama šiandien", "Ištisus metus", ...rawCategories];

    container.innerHTML = `
        <div class="space-y-4 max-w-4xl mx-auto py-2">
            <div class="flex items-center justify-between border-b border-forestBorder pb-3">
                <div class="flex items-center gap-3">
                    <button id="seasons-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none">
                        ←
                    </button>
                    <div>
                        <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Medžioklės ir žvejybos terminai</h2>
                        <p id="seasons-stats-count" class="text-[11px] text-forestPrimary font-bold">Kraunama...</p>
                    </div>
                </div>
            </div>

            <!-- Čia įstatomas universalus paieškos ir filtrų komponentas -->
            <div id="seasons-filter-component"></div>

            <!-- Sąrašo konteineris -->
            <div id="seasons-cards-list" class="space-y-3 pt-1"></div>
        </div>
    `;

    document.getElementById('seasons-back-btn')?.addEventListener('click', onBack);

    // INICIALIZUOJAME BENDRĄ KOMPONENTĄ
    createSearchFilter({
        container: document.getElementById('seasons-filter-component'),
        placeholder: "Ieškoti žvėries, paukščio, žuvies, vėžio...",
        categories: categories,
        initialCategory: selectedCategory,
        onFilterChange: ({ query, category }) => {
            searchQuery = query;
            selectedCategory = category;
            updateCardsList();
        }
    });

    updateCardsList();
}

function updateCardsList() {
    const listContainer = document.getElementById('seasons-cards-list');
    const statsElem = document.getElementById('seasons-stats-count');
    if (!listContainer) return;

    const today = new Date();
    let openCount = 0;
    seasonsData.forEach(item => {
        if (checkStatus(item, today).isOpen) openCount++;
    });
    if (statsElem) statsElem.innerText = `Šiandien leidžiama: ${openCount} rūšių`;

    const filtered = seasonsData.filter(item => {
        const status = checkStatus(item, today);
        const matchesSearch = searchQuery === "" ||
            item.name.toLowerCase().includes(searchQuery) ||
            item.category.toLowerCase().includes(searchQuery) ||
            (item.notes && item.notes.toLowerCase().includes(searchQuery));

        if (!matchesSearch) return false;
        if (selectedCategory === "Visi") return true;
        if (selectedCategory === "🟢 Leidžiama šiandien") return status.isOpen;
        if (selectedCategory === "Ištisus metus") return item.allYear === true;
        return item.category === selectedCategory;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `<div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center text-xs text-forestSecondary">Rūšių pagal pasirinktus kriterijus nerasta.</div>`;
        return;
    }

    listContainer.innerHTML = filtered.map(item => {
        const status = checkStatus(item, today);
        let badgeHtml = '';
        if (status.isAllYear) {
            badgeHtml = `<span class="bg-blue-950/40 border border-blue-500/50 text-blue-400 px-2.5 py-0.5 rounded-lg text-[11px] font-bold font-oswald uppercase">Ištisus metus</span>`;
        } else if (status.isOpen) {
            badgeHtml = `<span class="bg-green-950/40 border border-green-500/50 text-green-400 px-2.5 py-0.5 rounded-lg text-[11px] font-bold font-oswald uppercase">LEIDŽIAMA</span>`;
        } else {
            badgeHtml = `<span class="bg-red-950/40 border border-red-500/50 text-red-400 px-2.5 py-0.5 rounded-lg text-[11px] font-bold font-oswald uppercase">DRAUDŽIAMA</span>`;
        }

        const seasonText = item.allYear 
            ? "Ištisus metus" 
            : `${MONTH_NAMES[item.startMonth - 1]} ${item.startDay} d. – ${MONTH_NAMES[item.endMonth - 1]} ${item.endDay} d.`;

        const icon = item.category === "Žuvys" ? "🎣" : item.category === "Vėžiai" ? "🦞" : "🏹";

        return `
            <div class="bg-forestSurface border border-forestBorder hover:border-forestPrimary/60 rounded-2xl p-4 transition duration-200 space-y-3">
                <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                        <h4 class="text-sm sm:text-base font-bold text-white font-oswald uppercase tracking-tight">
                            ${item.name}
                        </h4>
                        <p class="text-xs text-forestSecondary">
                            📅 Sezonas: <strong class="text-white">${seasonText}</strong>
                        </p>
                    </div>
                    <div class="flex flex-col items-start sm:items-end gap-1">
                        ${badgeHtml}
                        <span class="text-[11px] text-forestSecondary">${status.daysText}</span>
                    </div>
                </div>

                <div class="pt-2 border-t border-forestBorder/60 flex flex-wrap justify-between items-center gap-2 text-xs">
                    <span class="text-forestPrimary bg-forestBackground px-2.5 py-1 rounded-md border border-forestBorder text-[11px]">
                        ${icon} Būdai: ${item.methods}
                    </span>
                    <span class="text-slate-400 text-[11px] italic">
                        ℹ️ ${item.notes}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}