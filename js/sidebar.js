// js/sidebar.js

export function renderGlobalSidebar(activePage = 'index', activeTab = 0) {
    const sidebarContainer = document.getElementById('global-sidebar');
    const mobileHeaderContainer = document.getElementById('global-mobile-header');
    const mobileNavContainer = document.getElementById('global-mobile-nav');

    const isIndex = activePage === 'index';

    // Pagalbinė funkcija nuorodoms: jei esame grudai.html, nukreipiame į index.html su tabo numeriu
    const getNavClickAction = (tabIdx) => {
        if (isIndex) {
            return `data-tab="${tabIdx}"`;
        } else {
            return `onclick="window.location.href='index.html?tab=${tabIdx}'"`;
        }
    };

    // 1. DESKTOP ŠONINIS MENIU
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
            <aside class="hidden md:flex flex-col justify-between w-72 bg-tractorSurface border-r border-tractorBorder p-6 h-full shrink-0">
                <div class="space-y-6">
                    <div class="flex items-center justify-between border-b border-tractorBorder/70 pb-5">
                        <a href="index.html" class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-tractorPrimary/20 border border-tractorPrimary/40 flex items-center justify-center text-xl">
                                🚜
                            </div>
                            <div>
                                <span class="font-oswald text-xl font-bold tracking-wider text-white block">NEIGHBOR P.M.</span>
                                <span class="text-[10px] text-tractorPrimaryLight font-semibold uppercase tracking-widest">Ūkininkų portalas</span>
                            </div>
                        </a>

                        <button class="btn-theme-toggle p-2 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-sm transition cursor-pointer" title="Perjungti temą">
                            <span class="theme-toggle-icon">☀️</span>
                        </button>
                    </div>
                    
                    <nav class="space-y-1.5">
                        <button class="nav-tab-btn w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3.5 cursor-pointer ${isIndex && activeTab === 0 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" ${getNavClickAction(0)}>
                            <span class="text-lg">🚨</span> <span>SOS Skelbimai</span>
                        </button>
                        <button class="nav-tab-btn w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3.5 cursor-pointer ${isIndex && activeTab === 5 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" ${getNavClickAction(5)}>
                            <span class="text-lg">🌦️</span> <span>Agro-Orai (Purškimas)</span>
                        </button>
                        <button class="nav-tab-btn w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3.5 cursor-pointer ${isIndex && activeTab === 1 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" ${getNavClickAction(1)}>
                            <span class="text-lg">🗺️</span> <span>Mano laukai</span>
                        </button>
                        <button class="nav-tab-btn w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3.5 cursor-pointer ${isIndex && activeTab === 4 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" ${getNavClickAction(4)}>
                            <span class="text-lg">📄</span> <span>Ataskaitos</span>
                        </button>
                        <a href="grudai.html" class="w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3.5 ${!isIndex ? 'bg-tractorPrimary text-white shadow' : 'text-green-400 bg-tractorPrimary/10 border border-tractorPrimary/30 hover:bg-tractorPrimary/20'}">
                            <span class="text-lg">🧮</span> <span>Skaičiuoklės</span>
                        </a>
                        <button class="nav-tab-btn w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3.5 cursor-pointer ${isIndex && activeTab === 2 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" ${getNavClickAction(2)}>
                            <span class="text-lg">🔧</span> <span>Mano technika</span>
                        </button>
                        <button class="nav-tab-btn w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-3.5 cursor-pointer ${isIndex && activeTab === 3 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-400 hover:text-white'}" ${getNavClickAction(3)}>
                            <span class="text-lg">⚙️</span> <span>Nustatymai</span>
                        </button>
                    </nav>
                </div>

                <div class="border-t border-tractorBorder/70 pt-4 space-y-3">
                    <button id="help-btn-desktop" class="w-full py-2.5 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition cursor-pointer">
                        <span>📖</span> <span>Naudojimosi gidas</span>
                    </button>
                    
                    <div id="auth-sidebar-box" class="bg-tractorBg border border-tractorBorder/60 p-3 rounded-xl text-center space-y-2">
                        <p class="text-[11px] text-slate-400">Esate neprisijungęs</p>
                        <button class="login-trigger-btn w-full py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs font-bold rounded-lg shadow transition cursor-pointer">
                            Prisijungti su Google
                        </button>
                    </div>

                    <div class="text-center pt-1 border-t border-tractorBorder/40">
                        <a href="https://petrasmo.com" target="_blank" class="text-[11px] text-slate-400 hover:text-green-400 transition font-medium inline-flex items-center gap-1">
                            Sukurta: <strong class="hover:text-green-400">Petrasmo Studios</strong> ↗
                        </a>
                    </div>
                </div>
            </aside>
        `;
    }

    // 2. MOBILI VIRŠUTINĖ JUOSTA
    if (mobileHeaderContainer) {
        mobileHeaderContainer.innerHTML = `
            <div class="md:hidden bg-tractorSurface border-b border-tractorBorder w-full px-4 py-3 flex justify-between items-center z-10 shrink-0">
                <a href="index.html" class="flex items-center gap-2">
                    <span class="text-xl">🚜</span>
                    <span class="font-oswald text-lg font-bold tracking-wider text-tractorPrimaryLight">NEIGHBOR P.M.</span>
                </a>
                <div class="flex items-center gap-2">
                    <button class="btn-theme-toggle px-2.5 py-1 bg-tractorBg border border-tractorBorder rounded-lg text-xs font-bold">
                        <span class="theme-toggle-icon">☀️</span>
                    </button>
                    <div id="auth-status-mobile">
                        <button class="login-trigger-btn px-3 py-1 bg-tractorPrimary text-white rounded-lg text-xs font-bold">
                            Prisijungti
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 3. MOBILI APATINĖ JUOSTA
    if (mobileNavContainer) {
        mobileNavContainer.innerHTML = `
            <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-tractorSurface border-t border-tractorBorder h-16 flex justify-around items-center z-50">
                <button class="nav-tab-btn flex flex-col items-center justify-center w-12 h-full text-xs ${isIndex && activeTab === 0 ? 'text-white bg-tractorPrimary' : 'text-slate-400'}" ${getNavClickAction(0)}>
                    <span class="text-base">🚨</span>
                    <span class="mt-0.5 font-bold text-[9px]">Skelbimai</span>
                </button>
                <button class="nav-tab-btn flex flex-col items-center justify-center w-12 h-full text-xs ${isIndex && activeTab === 5 ? 'text-white bg-tractorPrimary' : 'text-slate-400'}" ${getNavClickAction(5)}>
                    <span class="text-base">🌦️</span>
                    <span class="mt-0.5 font-bold text-[9px]">Orai</span>
                </button>
                <button class="nav-tab-btn flex flex-col items-center justify-center w-12 h-full text-xs ${isIndex && activeTab === 1 ? 'text-white bg-tractorPrimary' : 'text-slate-400'}" ${getNavClickAction(1)}>
                    <span class="text-base">🗺️</span>
                    <span class="mt-0.5 font-bold text-[9px]">Laukai</span>
                </button>
                <a href="grudai.html" class="flex flex-col items-center justify-center w-12 h-full text-xs ${!isIndex ? 'text-white bg-tractorPrimary' : 'text-green-400'}">
                    <span class="text-base">🧮</span>
                    <span class="mt-0.5 font-bold text-[9px]">Skaičiuotuvai</span>
                </a>
                <button class="nav-tab-btn flex flex-col items-center justify-center w-12 h-full text-xs ${isIndex && activeTab === 3 ? 'text-white bg-tractorPrimary' : 'text-slate-400'}" ${getNavClickAction(3)}>
                    <span class="text-base">⚙️</span>
                    <span class="mt-0.5 font-bold text-[9px]">Profilis</span>
                </button>
            </nav>
        `;
    }
}