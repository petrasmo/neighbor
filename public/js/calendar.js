import { db } from './firebase.js';

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
        renderCalendarBase(container, onBack);
        
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

    renderCalendarBase(container, onBack);
}

function renderCalendarBase(container, onBack) {
    const currentTimestampSeconds = Math.floor(Date.now() / 1000);
    const categories = ["Visi", ...Array.from(new Set(calendarEvents.map(e => e.category).filter(Boolean)))];

    const filtered = calendarEvents.filter(ev => {
        const matchesCategory = selectedCategory === "Visi" || ev.category === selectedCategory;
        const matchesSearch = searchQuery === "" ||
            (ev.title && ev.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const isUpcoming = (ev.dateTimestamp || 0) >= currentTimestampSeconds;
        return matchesCategory && matchesSearch && isUpcoming;
    });

    const categoryChipsHtml = categories.map(cat => {
        const isSelected = selectedCategory === cat;
        const btnClass = isSelected 
            ? 'bg-forestPrimary text-white border-forestPrimary shadow-md' 
            : 'bg-forestSurface text-forestSecondary border-forestBorder hover:border-forestPrimary';
        return `<button class="cal-cat-btn px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${btnClass}" data-cat="${cat}">${cat}</button>`;
    }).join('');

    let contentHtml = "";
    if (isCalendarLoading) {
        contentHtml = `
            <div class="flex flex-col items-center justify-center py-16 space-y-3">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-forestPrimary"></div>
                <p class="text-forestSecondary text-xs">Kraunami medžioklės renginiai iš debesies...</p>
            </div>
        `;
    } else if (filtered.length === 0) {
        contentHtml = `
            <div class="bg-forestSurface border border-forestBorder p-8 rounded-2xl text-center space-y-2">
                <span class="text-3xl block">📅</span>
                <p class="text-sm font-bold text-white">Būsimų renginių šiuo metu nerasta</p>
                <p class="text-xs text-forestSecondary">Patikrinkite vėliau arba pakeiskite filtrus.</p>
            </div>
        `;
    } else {
        contentHtml = filtered.map(createEventCardHtml).join('');
    }

    container.innerHTML = `
        <div class="space-y-4 max-w-4xl mx-auto py-2">
            <div class="flex items-center gap-3 border-b border-forestBorder pb-3">
                <button id="calendar-back-btn" class="w-9 h-9 rounded-xl bg-forestSurface border border-forestBorder hover:border-forestPrimary flex items-center justify-center text-white text-sm transition focus:outline-none">
                    ←
                </button>
                <div>
                    <h2 class="text-lg md:text-xl font-bold font-oswald text-white uppercase tracking-wider">Renginių kalendorius</h2>
                    <p class="text-[11px] text-forestSecondary">Būsimi renginiai ir egzaminai</p>
                </div>
            </div>

            <div class="relative">
                <input id="calendar-search-input" type="text" value="${searchQuery}" placeholder="Ieškoti renginio, vietos..." 
                    class="w-full h-11 bg-forestSurface border border-forestBorder focus:border-forestPrimary rounded-xl px-4 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none transition">
                <span class="absolute left-3.5 top-3.5 text-xs text-slate-500">🔍</span>
                ${searchQuery ? `<button id="calendar-clear-search" class="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-white">✕</button>` : ''}
            </div>

            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                ${categoryChipsHtml}
            </div>

            <div class="space-y-3 pt-1">
                ${contentHtml}
            </div>
        </div>
    `;

    document.getElementById('calendar-back-btn')?.addEventListener('click', onBack);

    const searchInput = document.getElementById('calendar-search-input');
    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCalendarBase(container, onBack);
        document.getElementById('calendar-search-input')?.focus();
    });

    document.getElementById('calendar-clear-search')?.addEventListener('click', () => {
        searchQuery = "";
        renderCalendarBase(container, onBack);
    });

    document.querySelectorAll('.cal-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedCategory = btn.getAttribute('data-cat');
            renderCalendarBase(container, onBack);
        });
    });

    document.querySelectorAll('.calendar-event-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            const id = card.getAttribute('data-id');
            if (expandedEventIds.has(id)) {
                expandedEventIds.delete(id);
            } else {
                expandedEventIds.add(id);
            }
            renderCalendarBase(container, onBack);
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

            const startFormatted = formatGoogleCalDate(startDate);
            const endFormatted = formatGoogleCalDate(endDate);

            const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}&location=${loc}&dates=${startFormatted}/${endFormatted}`;
            window.open(gCalUrl, '_blank');
        });
    });
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