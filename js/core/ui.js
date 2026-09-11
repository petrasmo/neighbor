// js/core/ui.js

export function switchTab(tabIndex) {
    // Visi unikalūs puslapio konteineriai
    const allViews = [
        document.getElementById('view-tab-calculators'), // 0
        document.getElementById('view-tab-weather'),     // 1
        document.getElementById('view-tab-fields'),      // 2, 3, 4, 5 (Laukai, Tręšimas, Kalkinimas, Žurnalas)
        document.getElementById('view-tab-reports'),     // 6
        document.getElementById('view-tab-feed'),        // 7 (SOS)
        document.getElementById('view-tab-garage'),      // 8 (Technika)
        document.getElementById('view-tab-settings')     // 9 (Nustatymai)
    ];

    // Nustatome, kurį elementą turime parodyti
    let targetView = document.getElementById('view-tab-calculators');
    if (tabIndex === 1) targetView = document.getElementById('view-tab-weather');
    else if (tabIndex >= 2 && tabIndex <= 5) targetView = document.getElementById('view-tab-fields');
    else if (tabIndex === 6) targetView = document.getElementById('view-tab-reports');
    else if (tabIndex === 7) targetView = document.getElementById('view-tab-feed');
    else if (tabIndex === 8) targetView = document.getElementById('view-tab-garage');
    else if (tabIndex === 9) targetView = document.getElementById('view-tab-settings');

    // Perjungiame hidden klases
    allViews.forEach(el => {
        if (!el) return;
        if (el === targetView) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        const btnTab = parseInt(btn.getAttribute('data-tab'));
        if (btnTab === tabIndex) {
            btn.classList.add('bg-tractorPrimary', 'text-white');
            btn.classList.remove('text-slate-300', 'hover:text-white', 'hover:bg-tractorCard');
        } else {
            btn.classList.remove('bg-tractorPrimary', 'text-white');
            btn.classList.add('text-slate-300', 'hover:text-white', 'hover:bg-tractorCard');
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
export function showBottomToast(message, type = 'success') {
    let toastContainer = document.getElementById('global-bottom-toast');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'global-bottom-toast';
        toastContainer.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] pointer-events-none transition-all duration-300 opacity-0 transform translate-y-4';
        document.body.appendChild(toastContainer);
    }

    const bgClass = type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white';
    toastContainer.innerHTML = `
        <div class="${bgClass} px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs md:text-sm flex items-center gap-2.5 pointer-events-auto border border-white/20">
            <span>${type === 'error' ? '🛑' : '✅'}</span>
            <span>${message}</span>
        </div>
    `;

    setTimeout(() => {
        toastContainer.classList.remove('opacity-0', 'translate-y-4');
    }, 10);

    setTimeout(() => {
        toastContainer.classList.add('opacity-0', 'translate-y-4');
    }, 3500);
}