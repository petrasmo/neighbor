// js/garage.js
import { db } from './firebase.js';
import { showDialog } from './ui.js';

export async function initGarageTab(currentUser, userData) {
    const container = document.getElementById('view-tab-garage');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder pb-5">
            <div>
                <h2 class="font-oswald text-2xl font-bold uppercase tracking-wider text-white">MANO TECHNIKA</h2>
                <p class="text-xs text-slate-400 mt-1">Išskleiskite kategorijas ir pažymėkite turimą techniką kaimynų pagalbai.</p>
            </div>
            <button id="save-tech-btn-top" class="h-11 px-8 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 flex items-center justify-center gap-2 cursor-pointer transition">
                <span>💾</span> <span class="text-white font-black">IŠSAUGOTI PASIRINKIMĄ</span>
            </button>
        </div>

        <div id="tech-accordion-container" class="space-y-3 pt-2">
            <div class="text-center py-12 text-slate-500 text-xs">Kraunamas technikos klasifikatorius...</div>
        </div>

        <div class="pt-4 pb-12">
            <button id="save-tech-btn-bottom" class="w-full h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-tractorPrimary/20 flex items-center justify-center gap-2 cursor-pointer transition">
                <span>💾</span> <span class="text-white font-black">IŠSAUGOTI PASIRINKIMĄ</span>
            </button>
        </div>
    `;

    const snap = await db.collection("tech_classifier").get();
    const accordionBox = document.getElementById('tech-accordion-container');
    if (!accordionBox) return;
    accordionBox.innerHTML = '';

    const owned = userData?.ownedTech || [];

    snap.forEach((doc, idx) => {
        const cat = doc.data();
        const catId = doc.id;
        const catTitle = cat.name?.lt || cat.name?.en || "Kategorija";
        const items = cat.items || [];
        
        const selectedCountInCat = items.filter(it => owned.includes(it.id)).length;
        const isInitiallyOpen = idx === 0;

        const catCard = document.createElement('div');
        catCard.className = "bg-tractorSurface border border-tractorBorder rounded-2xl overflow-hidden transition-all duration-200";
        catCard.id = `cat-card-${catId}`;

        let headerHtml = `
            <div class="cat-toggle-header flex items-center justify-between p-4 cursor-pointer hover:bg-tractorCard select-none transition" data-cat-id="${catId}">
                <div class="flex items-center gap-3">
                    <span class="w-2.5 h-2.5 rounded-full bg-tractorPrimary"></span>
                    <h3 class="text-xs md:text-sm font-bold text-white uppercase tracking-wider">${catTitle}</h3>
                    <span id="badge-count-${catId}" class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedCountInCat > 0 ? 'bg-tractorPrimary/30 text-tractorPrimaryLight border border-tractorPrimary/50' : 'hidden'
                    }">
                        Pasirinkta: ${selectedCountInCat}
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="cat-arrow text-slate-400 text-xs transform transition-transform duration-200 ${isInitiallyOpen ? 'rotate-180' : ''}">
                        ▼
                    </span>
                </div>
            </div>
        `;

        let bodyHtml = `
            <div id="cat-body-${catId}" class="p-4 pt-0 border-t border-tractorBorder/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 ${isInitiallyOpen ? '' : 'hidden'}">
        `;

        items.forEach(item => {
            const isChecked = owned.includes(item.id);
            bodyHtml += `
                <div data-tech-id="${item.id}" data-parent-cat="${catId}" class="tech-tile relative flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                    isChecked 
                    ? 'bg-tractorPrimary/20 border-tractorPrimary text-white shadow-md' 
                    : 'bg-tractorBg border-tractorBorder text-slate-300 hover:border-slate-500 hover:bg-zinc-900'
                }">
                    <input type="checkbox" class="owned-tech-cb hidden" value="${item.id}" ${isChecked ? 'checked' : ''}>
                    <div class="checkbox-indicator w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isChecked ? 'bg-tractorPrimary border-tractorPrimary text-white' : 'border-slate-600 bg-transparent'
                    }">
                        <span class="text-xs font-bold ${isChecked ? '' : 'hidden'}">✓</span>
                    </div>
                    <span class="text-xs font-semibold">${item.lt || item.en}</span>
                </div>
            `;
        });

        bodyHtml += `</div>`;
        catCard.innerHTML = headerHtml + bodyHtml;
        accordionBox.appendChild(catCard);
    });

    document.querySelectorAll('.cat-toggle-header').forEach(header => {
        header.onclick = function() {
            const catId = this.getAttribute('data-cat-id');
            const body = document.getElementById(`cat-body-${catId}`);
            const arrow = this.querySelector('.cat-arrow');

            const isHidden = body.classList.contains('hidden');
            if (isHidden) {
                body.classList.remove('hidden');
                arrow.classList.add('rotate-180');
            } else {
                body.classList.add('hidden');
                arrow.classList.remove('rotate-180');
            }
        };
    });

    document.querySelectorAll('.tech-tile').forEach(tile => {
        tile.onclick = function(e) {
            e.stopPropagation();
            const cb = this.querySelector('.owned-tech-cb');
            const indicator = this.querySelector('.checkbox-indicator');
            const checkIcon = indicator.querySelector('span');
            const parentCatId = this.getAttribute('data-parent-cat');

            cb.checked = !cb.checked;

            if (cb.checked) {
                this.className = "tech-tile relative flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none bg-tractorPrimary/20 border-tractorPrimary text-white shadow-md";
                indicator.className = "checkbox-indicator w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition bg-tractorPrimary border-tractorPrimary text-white";
                checkIcon.classList.remove('hidden');
            } else {
                this.className = "tech-tile relative flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none bg-tractorBg border-tractorBorder text-slate-300 hover:border-slate-500 hover:bg-zinc-900";
                indicator.className = "checkbox-indicator w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition border-slate-600 bg-transparent";
                checkIcon.classList.add('hidden');
            }

            updateCategoryBadge(parentCatId);
        };
    });

    function updateCategoryBadge(catId) {
        const body = document.getElementById(`cat-body-${catId}`);
        const badge = document.getElementById(`badge-count-${catId}`);
        if (!body || !badge) return;

        const count = body.querySelectorAll('.owned-tech-cb:checked').length;
        if (count > 0) {
            badge.textContent = `Pasirinkta: ${count}`;
            badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-tractorPrimary/30 text-tractorPrimaryLight border border-tractorPrimary/50";
        } else {
            badge.className = "hidden";
        }
    }

    const handleSave = async () => {
        const selected = [];
        document.querySelectorAll('.owned-tech-cb:checked').forEach(cb => selected.push(cb.value));
        
        await db.collection("users").doc(currentUser.uid).update({
            ownedTech: selected
        });

        if (userData) {
            userData.ownedTech = selected;
        }

        showDialog("Išsaugota! 🚜", `Sėkmingai atnaujintas technikos parkas. Pasirinkta: ${selected.length} mašinų.`, "✅");
    };

    document.getElementById('save-tech-btn-top').onclick = handleSave;
    document.getElementById('save-tech-btn-bottom').onclick = handleSave;
}