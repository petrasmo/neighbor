// js/customSelect.js

export function createCustomSelect({ containerId, placeholder = "Pasirinkite...", items = [], selectedId = "", onSelect }) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    let currentSelected = items.find(it => it.id === selectedId) || null;

    container.innerHTML = `
        <div class="relative w-full custom-select-root select-none">
            <div class="relative">
                <input type="text" autocomplete="off" placeholder="${placeholder}" value="${currentSelected ? currentSelected.name : ''}"
                    class="cs-input w-full h-12 bg-tractorBg border border-tractorBorder focus:border-tractorPrimary rounded-xl pl-4 pr-10 text-xs md:text-sm text-white font-bold outline-none transition cursor-pointer">
                
                <button type="button" class="cs-clear-btn absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-base ${currentSelected ? '' : 'hidden'} cursor-pointer">
                    ✕
                </button>
            </div>

            <!-- IŠKRINTANTIS SĄRAŠAS -->
            <div class="cs-dropdown hidden absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-tractorSurface border border-tractorBorder rounded-xl shadow-2xl z-[100] divide-y divide-tractorBorder/50"></div>
        </div>
    `;

    const root = container.querySelector('.custom-select-root');
    const input = root.querySelector('.cs-input');
    const dropdown = root.querySelector('.cs-dropdown');
    const clearBtn = root.querySelector('.cs-clear-btn');

    const renderList = (filterText = '') => {
        const q = filterText.toLowerCase().trim();
        const filtered = items.filter(it => it.name.toLowerCase().includes(q) || (it.subtext && it.subtext.toLowerCase().includes(q)));

        if (filtered.length === 0) {
            dropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center">Nieko nerasta.</div>`;
        } else {
            dropdown.innerHTML = filtered.map(it => {
                const isSelected = currentSelected && currentSelected.id === it.id;
                return `
                    <div class="cs-item p-3 text-xs md:text-sm text-slate-200 hover:text-white hover:bg-tractorPrimary/20 cursor-pointer flex items-center justify-between transition ${isSelected ? 'bg-tractorPrimary/30 font-bold text-green-400' : ''}" data-id="${it.id}">
                        <div class="flex items-center gap-2.5">
                            ${it.icon ? `<span class="text-base">${it.icon}</span>` : ''}
                            <div>
                                <span class="block">${it.name}</span>
                                ${it.subtext ? `<span class="text-[10px] text-slate-400 block">${it.subtext}</span>` : ''}
                            </div>
                        </div>
                        ${isSelected ? '<span class="text-green-400 font-bold">✓</span>' : ''}
                    </div>
                `;
            }).join('');

            dropdown.querySelectorAll('.cs-item').forEach(el => {
                el.onclick = () => {
                    const id = el.getAttribute('data-id');
                    currentSelected = items.find(it => it.id === id);
                    input.value = currentSelected ? currentSelected.name : '';
                    clearBtn.classList.remove('hidden');
                    dropdown.classList.add('hidden');
                    if (onSelect) onSelect(currentSelected);
                };
            });
        }
        dropdown.classList.remove('hidden');
    };

    input.onfocus = () => renderList(input.value);
    input.oninput = (e) => {
        const val = e.target.value;
        if (val) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
        renderList(val);
    };

    clearBtn.onclick = (e) => {
        e.stopPropagation();
        input.value = '';
        currentSelected = null;
        clearBtn.classList.add('hidden');
        renderList('');
        input.focus();
        if (onSelect) onSelect(null);
    };

    document.addEventListener('click', (e) => {
        if (!root.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    return {
        setValue: (id) => {
            currentSelected = items.find(it => it.id === id) || null;
            input.value = currentSelected ? currentSelected.name : '';
            if (currentSelected) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
        },
        getValue: () => currentSelected
    };
}