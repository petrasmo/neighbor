// js/core/ui.js

export function switchTab(tabIndex) {
    const allViews = [
        document.getElementById('view-tab-calculators'), // 0
        document.getElementById('view-tab-weather'),     // 1
        document.getElementById('view-tab-fields'),      // 2, 3, 4, 5 (Laukai, Tręšimas, Kalkinimas, Žurnalas)
        document.getElementById('view-tab-reports'),     // 6
        document.getElementById('view-tab-feed'),        // 7 (SOS)
        document.getElementById('view-tab-garage'),      // 8 (Technika)
        document.getElementById('view-tab-settings'),    // 9 (Nustatymai)
        document.getElementById('view-tab-cropplanner')  // 10 Sėjomainos Planavimas (GAAB 7)
    ];

    let targetView = document.getElementById('view-tab-calculators');
    if (tabIndex === 1) targetView = document.getElementById('view-tab-weather');
    else if (tabIndex >= 2 && tabIndex <= 5) targetView = document.getElementById('view-tab-fields');
    else if (tabIndex === 6) targetView = document.getElementById('view-tab-reports');
    else if (tabIndex === 7) targetView = document.getElementById('view-tab-feed');
    else if (tabIndex === 8) targetView = document.getElementById('view-tab-garage');
    else if (tabIndex === 9) targetView = document.getElementById('view-tab-settings');
    else if (tabIndex === 10) targetView = document.getElementById('view-tab-cropplanner');

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

export function showBottomToast(message, type = 'success') {
    let toastContainer = document.getElementById('global-bottom-toast');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'global-bottom-toast';
        toastContainer.className = 'fixed bottom-20 md:bottom-10 left-1/2 -translate-x-1/2 z-[300] pointer-events-none transition-all duration-300 opacity-0 transform translate-y-4 w-[92%] sm:w-auto max-w-md flex justify-center';
        document.body.appendChild(toastContainer);
    }

    let bgStyle = 'background: linear-gradient(135deg, #15803d 0%, #166534 100%); border: 1px solid rgba(255, 255, 255, 0.25);';
    let icon = '✓';

    if (type === 'error') {
        bgStyle = 'background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border: 1px solid rgba(255, 255, 255, 0.25);';
        icon = '✕';
    } else if (type === 'warning') {
        bgStyle = 'background: linear-gradient(135deg, #d97706 0%, #b45309 100%); border: 1px solid rgba(255, 255, 255, 0.25);';
        icon = '!';
    } else if (type === 'info') {
        bgStyle = 'background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border: 1px solid rgba(255, 255, 255, 0.25);';
        icon = 'ℹ';
    }

    const formattedMessage = message.replace(/🚜/g, `
        <span style="display: inline-flex; align-items: center; justify-content: center; background: #FFFFFF; border-radius: 6px; padding: 2px 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); vertical-align: middle; margin-left: 6px; shrink: 0;">
            <span style="font-size: 15px; line-height: 1;">🚜</span>
        </span>
    `);

    toastContainer.innerHTML = `
        <div style="${bgStyle} color: #FFFFFF !important; box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.45);" 
             class="w-full sm:w-auto px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 pointer-events-auto tracking-wide text-center">
            <span style="background: rgba(255, 255, 255, 0.2); color: #FFFFFF !important;" class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0">${icon}</span>
            <span style="color: #FFFFFF !important; display: inline-flex; align-items: center; white-space: normal;">${formattedMessage}</span>
        </div>
    `;

    setTimeout(() => {
        toastContainer.classList.remove('opacity-0', 'translate-y-4');
    }, 10);

    setTimeout(() => {
        toastContainer.classList.add('opacity-0', 'translate-y-4');
    }, 3200);
}

/**
 * 🌟 Tikras Bottom Sheet patvirtinimo langas (ir kompiuteryje, ir telefone)
 */
export function showDialog(title, message, icon = "⚠️", onConfirm = null, showCancel = false) {
    const dialog = document.getElementById('custom-dialog');
    if (!dialog) return;

    const titleEl = document.getElementById('dialog-title');
    const msgEl = document.getElementById('dialog-message');
    const iconEl = document.getElementById('dialog-icon');
    const confirmBtn = document.getElementById('dialog-confirm-btn');
    const cancelBtn = document.getElementById('dialog-cancel-btn');

    const panel = dialog.firstElementChild;

    dialog.className = 'fixed inset-0 bg-black/75 flex flex-col justify-end items-center z-[250] p-0 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto';
    
    if (panel) {
        panel.className = 'bg-tractorSurface border-t-2 border-x-2 border-b-0 border-tractorBorder rounded-t-3xl rounded-b-none p-6 md:p-8 max-w-2xl w-full text-center space-y-5 shadow-2xl transition-transform duration-300 transform translate-y-full pointer-events-auto relative z-10';
    }

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    iconEl.textContent = icon;

    const closeSheet = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (panel) panel.classList.add('translate-y-full');
        dialog.classList.add('opacity-0');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('opacity-0');
        }, 250);
    };

    if (showCancel) {
        cancelBtn.classList.remove('hidden');
        cancelBtn.setAttribute('type', 'button');
        cancelBtn.textContent = "Atšaukti";
        cancelBtn.className = "flex-1 h-12 bg-tractorBg hover:bg-zinc-800 border border-tractorBorder rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer text-slate-300 hover:text-white pointer-events-auto relative z-20";
        cancelBtn.onclick = closeSheet;

        confirmBtn.textContent = "Patvirtinti";
    } else {
        cancelBtn.classList.add('hidden');
        confirmBtn.textContent = "Supratau 👍";
    }

    confirmBtn.setAttribute('type', 'button');
    confirmBtn.className = "flex-1 h-12 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer pointer-events-auto relative z-20";
    confirmBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
        if (onConfirm) onConfirm();
    };

    dialog.onclick = (e) => {
        if (e.target === dialog) closeSheet(e);
    };

    dialog.classList.remove('hidden');
    setTimeout(() => {
        if (panel) panel.classList.remove('translate-y-full');
    }, 15);
}