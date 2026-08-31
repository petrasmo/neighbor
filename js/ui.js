// js/ui.js
export function switchTab(tabIndex) {
    const views = [
        document.getElementById('view-tab-feed'),      // 0: SOS Skelbimai
        document.getElementById('view-tab-grain'),     // 1: Grūdų kainos
        document.getElementById('view-tab-garage'),    // 2: Mano technika
        document.getElementById('view-tab-settings')   // 3: Nustatymai
    ];

    views.forEach((view, idx) => {
        if (view) {
            if (idx === tabIndex) view.classList.remove('hidden');
            else view.classList.add('hidden');
        }
    });

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        const btnTab = parseInt(btn.getAttribute('data-tab'));
        if (btnTab === tabIndex) {
            btn.classList.add('bg-tractorPrimary', 'text-white');
            btn.classList.remove('text-tractorSecondary');
        } else {
            btn.classList.remove('bg-tractorPrimary', 'text-white');
            btn.classList.add('text-tractorSecondary');
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