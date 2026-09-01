// js/ui.js
export function switchTab(tabIndex) {
    const views = {
        0: document.getElementById('view-tab-calculators'), // 0: Skaičiuoklės (Default)
        1: document.getElementById('view-tab-weather'),     // 1: Agro-Orai
        2: document.getElementById('view-tab-fields'),      // 2: Mano laukai
        3: document.getElementById('view-tab-reports'),     // 3: Ataskaitos
        4: document.getElementById('view-tab-garage'),      // 4: Mano technika
        5: document.getElementById('view-tab-feed'),        // 5: SOS Skelbimai
        6: document.getElementById('view-tab-settings')     // 6: Nustatymai
    };

    Object.entries(views).forEach(([idx, el]) => {
        if (el) {
            if (parseInt(idx) === tabIndex) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    });

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        const btnTab = parseInt(btn.getAttribute('data-tab'));
        if (btnTab === tabIndex) {
            btn.classList.add('bg-tractorPrimary', 'text-white');
            btn.classList.remove('text-slate-400');
        } else {
            btn.classList.remove('bg-tractorPrimary', 'text-white');
            btn.classList.add('text-slate-400');
        }
    });
}

export function showDialog(title, message, icon = "⚠️", onConfirm = null, showCancel = false) {
    const dialog = document.getElementById('custom-dialog');
    const titleEl = document.getElementById('dialog-title');
    const msgEl = document.getElementById('dialog-message');
    const iconEl = document.getElementById('dialog-icon');
    const confirmBtn = document.getElementById('dialog-confirm-btn');
    const cancelBtn = document.getElementById('dialog-cancel-btn');

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    iconEl.textContent = icon;

    if (showCancel) {
        cancelBtn.classList.remove('hidden');
        cancelBtn.onclick = () => dialog.classList.add('hidden');
    } else {
        cancelBtn.classList.add('hidden');
    }

    confirmBtn.onclick = () => {
        dialog.classList.add('hidden');
        if (onConfirm) onConfirm();
    };

    dialog.classList.remove('hidden');
}