// js/ui.js
export const loggedOutState = document.getElementById('logged-out-state');
export const loggedInState = document.getElementById('logged-in-state');
export const userEmailSidebar = document.getElementById('user-email-sidebar');
export const loginGoogleBtn = document.getElementById('login-google-btn');

export const tabButtons = document.querySelectorAll('.nav-tab-btn');
export const tabViews = [
    document.getElementById('view-tab-home'),
    document.getElementById('view-tab-practice'),
    document.getElementById('view-tab-results'),
    document.getElementById('view-tab-settings')
];

export function showLoggedInUI(emailOrTitle, isGuest = false) {
    loggedOutState.classList.add('hidden');
    loggedInState.classList.remove('hidden');
    
    if (userEmailSidebar) {
        userEmailSidebar.innerText = emailOrTitle;
    }

    // 1. Sidebar atsijungimo mygtukas (kompiuteriuose)
    const sidebarLogoutBtn = document.querySelector('aside .logout-action-btn');
    if (sidebarLogoutBtn) {
        if (isGuest) {
            sidebarLogoutBtn.innerHTML = `<span>🔑</span> <span>Prisijungti</span>`;
            sidebarLogoutBtn.className = "logout-action-btn w-full h-11 bg-forestPrimary/15 hover:bg-forestPrimary/25 text-forestPrimary border border-forestPrimary/40 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2";
        } else {
            sidebarLogoutBtn.innerHTML = `<span>🚪</span> <span>Atsijungti</span>`;
            sidebarLogoutBtn.className = "logout-action-btn w-full h-11 bg-forestBackground hover:bg-red-950/30 text-slate-400 hover:text-red-400 border border-forestBorder hover:border-red-900/40 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2";
        }
    }

    // 2. Mobilus viršutinės juostos mygtukas (elegantiškas telefone)
    const mobileLogoutBtn = document.querySelector('.md\\:hidden .logout-action-btn');
    if (mobileLogoutBtn) {
        if (isGuest) {
            mobileLogoutBtn.innerHTML = `<span>🔑</span> <span>Prisijungti</span>`;
            mobileLogoutBtn.className = "logout-action-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-forestPrimary/15 text-forestPrimary border border-forestPrimary/40 flex items-center gap-1.5 transition";
        } else {
            mobileLogoutBtn.innerHTML = `<span>🚪</span> <span>Atsijungti</span>`;
            mobileLogoutBtn.className = "logout-action-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-forestBackground hover:bg-slate-800 text-slate-300 hover:text-red-400 border border-forestBorder flex items-center gap-1.5 transition";
        }
    }
}

export function showLoggedOutUI() {
    loggedOutState.classList.remove('hidden');
    loggedInState.classList.add('hidden');
}

export function updateCreditsUI(amount) {
    const userCreditsVal = document.getElementById('user-credits-val');
    if (userCreditsVal) {
        userCreditsVal.innerText = amount;
    }
    const homeCreditsVal = document.getElementById('home-credits-val');
    if (homeCreditsVal) {
        homeCreditsVal.innerText = typeof amount === 'number' ? amount + " 🪙" : amount;
    }
}

export function switchTab(activeIndex) {
    tabViews.forEach((view, index) => {
        if (index === activeIndex) {
            view.classList.remove('hidden');
        } else {
            view.classList.add('hidden');
        }
    });

    tabButtons.forEach(btn => {
        const btnIndex = parseInt(btn.getAttribute('data-tab'));
        if (btnIndex === activeIndex) {
            btn.classList.add('bg-forestBackground', 'text-forestPrimary');
            btn.classList.remove('text-forestSecondary');
        } else {
            btn.classList.remove('bg-forestBackground', 'text-forestPrimary');
            btn.classList.add('text-forestSecondary');
        }
    });
}

export function showDialog(title, message, icon = "⚠️", onConfirm = null, onCancel = null) {
    const dialog = document.getElementById('custom-dialog');
    const dTitle = document.getElementById('dialog-title');
    const dMessage = document.getElementById('dialog-message');
    const dIcon = document.getElementById('dialog-icon');
    const dConfirmBtn = document.getElementById('dialog-confirm-btn');
    const dCancelBtn = document.getElementById('dialog-cancel-btn');

    if (!dialog) return;

    dTitle.innerText = title;
    dMessage.innerText = message;
    dIcon.innerText = icon;

    if (onCancel) {
        dCancelBtn.classList.remove('hidden');
    } else {
        dCancelBtn.classList.add('hidden');
    }

    const newConfirmBtn = dConfirmBtn.cloneNode(true);
    const newCancelBtn = dCancelBtn.cloneNode(true);
    dConfirmBtn.parentNode.replaceChild(newConfirmBtn, dConfirmBtn);
    dCancelBtn.parentNode.replaceChild(newCancelBtn, dCancelBtn);

    newConfirmBtn.addEventListener('click', () => {
        dialog.classList.add('hidden');
        if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        dialog.classList.add('hidden');
        if (onCancel) onCancel();
    });

    dialog.classList.remove('hidden');
}