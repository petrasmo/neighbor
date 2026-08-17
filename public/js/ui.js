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

    // Pritaikome atsijungimo / prisijungimo mygtukus svečiui
    document.querySelectorAll('.logout-action-btn').forEach(btn => {
        if (isGuest) {
            btn.innerText = "Prisijungti 🔑";
            btn.className = "logout-action-btn w-full h-11 bg-forestPrimary/20 hover:bg-forestPrimary/30 text-forestPrimary border border-forestPrimary/40 rounded-xl font-bold text-xs transition";
        } else {
            btn.innerText = "Atsijungti";
            btn.className = "logout-action-btn w-full h-11 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-xl font-bold text-xs transition";
        }
    });
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