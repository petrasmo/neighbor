// js/calendar.js
import { db } from './firebase.js';
import { createSearchFilter } from './components/searchFilter.js';

let calendarEvents = [];
let searchQuery = "";
let selectedCategory = "Visi";
let expandedEventIds = new Set();
let isCalendarLoading = false;

function formatGoogleCalDate(d) {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function renderCalendarScreen(container, onBack) {
    if (calendarEvents.length === 0) {
        isCalendarLoading = true;
        renderCalendarLayout(container, onBack);
        
        try {
            const snapshot = await db.collection("events").orderBy("dateTimestamp", "asc").get();
            calendarEvents = [];
            snapshot.forEach(doc => {
                calendarEvents.push({ id: doc.id, ...doc.data() });
            });
        } catch (e) {
            console.error("Klaida nuskaitant renginius:", e);
        } finally {
            isCalendarLoading = false;
        }
    }

    renderCalendarLayout(container, onBack);
}

function renderCalendarLayout(container, onBack) {
    const categories = ["Visi", ...Array.from(new Set(calendarEvents.map(e => e.category).filter(Boolean)))];

    container.innerHTML = `
        <div class="space-y-4 max-w-4xl mx-auto py-2">
            <div class="flex items-center gap-3 border-b border-forestBorder pb-3">
                <button id="calendar-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none">
                    ←
                </button>
                <div>
                    <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Renginių kalendorius</h2>
                    <p id="calendar-count-info" class="text-[11px] text-forestSecondary">Būsimi renginiai ir egzaminai</p>
                </div>
            </div>

            <!-- Bendras paieškos ir filtrų komponentas -->
            <div id="calendar-filter-component"></div>

            <!-- Sąrašas -->
            <div id="calendar-events-list" class="space-y-3 pt-1"></div>
        </div>
    `;

    document.getElementById('calendar-back-btn')?.addEventListener('click', onBack);

    // INICIALIZUOJAME KOMPONENTĄ
    createSearchFilter({
        container: document.getElementById('calendar-filter-component'),
        placeholder: "Ieškoti renginio, vietos, datos...",
        categories: categories,
        initialCategory: selectedCategory,
        onFilterChange: ({ query, category }) => {
            searchQuery = query;
            selectedCategory = category;
            updateEventsList();
        }
    });

    updateEventsList();
}

function updateEventsList() {
    const container = document.getElementById('calendar-events-list');
    const countInfo = document.getElementById('calendar-count-info');
    if (!container) return;

    if (isCalendarLoading) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 space-y-3">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forestPrimary"></div>
                <p class="text-forestSecondary text-xs">Kraunami medžioklės renginiai iš debesies...</p>
            </div>
        `;
        return;
    }

    const currentTimestampSeconds = Math.floor(Date.now() / 1000);
    const filtered = calendarEvents.filter(ev => {
        const matchesCategory = selectedCategory === "Visi" || ev.category === selectedCategory;
        const matchesSearch = searchQuery === "" ||
            (ev.title && ev.title.toLowerCase().includes(searchQuery)) ||
            (ev.location && ev.location.toLowerCase().includes(searchQuery)) ||
            (ev.description && ev.description.toLowerCase().includes(searchQuery));
        
        const isUpcoming = (ev.dateTimestamp || 0) >= currentTimestampSeconds;
        return matchesCategory && matchesSearch && isUpcoming;
    });

    if (countInfo) countInfo.innerText = `Rasta būsimų renginių: ${filtered.length}`;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-2">
                <span class="text-3xl block">📅</span>
                <p class="text-sm font-bold text-white">Būsimų renginių šiuo metu nerasta</p>
                <p class="text-xs text-forestSecondary">Pakeiskite paieškos žodį arba kategoriją.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(createEventCardHtml).join('');
    attachEventCardListeners();
}

function createEventCardHtml(event) {
    const isExpanded = expandedEventIds.has(event.id);
    const dateParts = (event.dateReadable || "").split(" ");
    const yearText = dateParts[0] || "";
    const monthText = (dateParts[2] || "").substring(0, 3).toUpperCase();
    const dayText = dateParts[3] || "";

    let expandedHtml = "";
    if (isExpanded) {
        const navBtn = (event.latitude && event.longitude) 
            ? `<button class="nav-maps-btn flex-1 h-10 bg-forestBackground hover:bg-slate-800 border border-forestPrimary text-forestPrimary rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition" data-lat="${event.latitude}" data-lon="${event.longitude}"><span>🧭</span> <span>Naviguoti</span></button>` 
            : "";

        expandedHtml = `
            <div class="mt-4 pt-3 border-t border-forestBorder space-y-4 text-xs leading-relaxed">
                <p class="text-forestSecondary">${event.description || 'Išsamesnio aprašymo nėra.'}</p>
                <div class="flex flex-col sm:flex-row gap-2 pt-1">
                    ${navBtn}
                    <button class="add-cal-btn flex-1 h-10 bg-buttonBrown hover:bg-buttonBrownHover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                        data-title="${encodeURIComponent(event.title || '')}" 
                        data-desc="${encodeURIComponent(event.description || '')}" 
                        data-loc="${encodeURIComponent(event.location || '')}"
                        data-time="${event.dateTimestamp || 0}">
                        <span>📅</span> <span>Įrašyti į kalendorių</span>
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="calendar-event-card bg-forestSurface border border-forestBorder hover:border-forestPrimary/60 rounded-2xl p-4 transition duration-200 cursor-pointer" data-id="${event.id}">
            <div class="flex items-center gap-4">
                <div class="w-14 h-16 bg-forestBackground border border-forestBorder rounded-xl flex flex-col items-center justify-center shrink-0">
                    <span class="text-lg font-black text-forestPrimary leading-tight font-oswald">${dayText || "—"}</span>
                    <span class="text-[10px] font-bold text-forestSecondary uppercase">${monthText}</span>
                    <span class="text-[9px] font-bold text-forestPrimary/80">${yearText}</span>
                </div>

                <div class="flex-1 space-y-1">
                    <h4 class="text-sm md:text-base font-bold text-white font-oswald uppercase tracking-tight">
                        ${event.title || 'Medžioklės renginys'}
                    </h4>
                    <p class="text-xs text-forestSecondary flex items-center gap-1">
                        <span>📍</span> <span>${event.location || 'Lietuva'}</span>
                    </p>
                </div>
            </div>
            ${expandedHtml}
        </div>
    `;
}

function attachEventCardListeners() {
    document.querySelectorAll('.calendar-event-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            const id = card.getAttribute('data-id');
            if (expandedEventIds.has(id)) {
                expandedEventIds.delete(id);
            } else {
                expandedEventIds.add(id);
            }
            updateEventsList();
        });
    });

    document.querySelectorAll('.nav-maps-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lat = btn.getAttribute('data-lat');
            const lon = btn.getAttribute('data-lon');
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank');
        });
    });

    document.querySelectorAll('.add-cal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = btn.getAttribute('data-title');
            const desc = btn.getAttribute('data-desc');
            const loc = btn.getAttribute('data-loc');
            const timeSeconds = parseInt(btn.getAttribute('data-time') || "0");

            const startDate = new Date(timeSeconds * 1000);
            const endDate = new Date((timeSeconds + 7200) * 1000);

            const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}&location=${loc}&dates=${formatGoogleCalDate(startDate)}/${formatGoogleCalDate(endDate)}`;
            window.open(gCalUrl, '_blank');
        });
    });
}