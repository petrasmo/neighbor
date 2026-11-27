// js/core/sidebar.js

export function renderGlobalSidebar(activePage = 'index', activeTab = 0) {
    const sidebarContainer = document.getElementById('global-sidebar');
    const mobileHeaderContainer = document.getElementById('global-mobile-header');
    const mobileNavContainer = document.getElementById('global-mobile-nav');

    const isIndex = activePage === 'index';

    const getNavClickAction = (tabIdx) => {
        if (isIndex) {
            return `data-tab="${tabIdx}"`;
        } else {
            return `onclick="window.location.href='index.html?tab=${tabIdx}'"`;
        }
    };

    const isUkisActive = (activeTab >= 2 && activeTab <= 6) || activeTab === 10;
    const isTechnikaActive = activeTab === 13 || activeTab === 14;
    const isBendruomeneActive = (activeTab >= 7 && activeTab <= 8) || activeTab === 11 || activeTab === 12;

    // 1. DESKTOP ŠONINIS MENIU
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
            <aside class="flex flex-col justify-between w-72 bg-tractorSurface border-r border-tractorBorder p-5 h-full shrink-0 overflow-y-auto">
                <div class="space-y-3.5">
                    
                    <!-- LOGOTIPAS IR PAGALBOS / TEMOS MYGTUKAI -->
                    <div class="flex items-center justify-between gap-2 pb-1">
                        <a href="index.html" class="flex items-center gap-2.5 min-w-0">
                            <div class="w-9 h-9 rounded-xl bg-tractorPrimary/20 border border-tractorPrimary/40 flex items-center justify-center text-lg shrink-0 notranslate" translate="no">
                                🚜
                            </div>
                            <div class="min-w-0">
                                <span class="font-oswald text-xl font-black tracking-wider block leading-tight notranslate" translate="no" style="color: var(--text-main);">JURGISAGRO</span>
                                <span class="text-[10px] text-green-500 font-bold uppercase tracking-widest block leading-tight">Ūkininkų portalas</span>
                            </div>
                        </a>

                        <div class="flex items-center gap-1 shrink-0">
                            <button id="help-btn-desktop" class="w-8 h-8 flex items-center justify-center bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs transition cursor-pointer" title="Pagalba ir instrukcija">
                                <span class="notranslate" translate="no">📖</span>
                            </button>
                            <button class="btn-theme-toggle w-8 h-8 flex items-center justify-center bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs transition cursor-pointer" aria-label="Perjungti temą" title="Perjungti temą">
                                <span class="theme-toggle-icon notranslate" translate="no">☀️</span>
                            </button>
                        </div>
                    </div>

                    <!-- KALBŲ PERJUNGIMO JUOSTELĖ -->
                    <div class="flex items-center justify-between bg-tractorBg border border-tractorBorder rounded-xl px-3 py-1.5 border-b border-tractorBorder/70">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <span class="notranslate" translate="no">🌍</span> <span>Kalba:</span>
                        </span>
                        <select class="lang-switcher-select notranslate h-6 px-2 bg-tractorSurface border border-tractorBorder rounded-lg text-[11px] font-extrabold outline-none cursor-pointer transition" translate="no" style="color: var(--text-main);" title="Kalba / Language">
                            <option value="lt">Lietuvių (LT)</option>
                            <option value="en">English (EN)</option>
                            <option value="lv">Latviešu (LV)</option>
                            <option value="et">Eesti (ET)</option>
                        </select>
                    </div>
                    
                    <nav class="space-y-2.5 text-xs pt-1 border-t border-tractorBorder/70">
                        
                        <!-- 1. SKAIČIUOKLĖS -->
                        <div class="space-y-1">
                            <button class="nav-tab-btn w-full text-left px-3.5 py-2.5 rounded-xl font-semibold transition flex items-center gap-3 cursor-pointer ${activeTab === 0 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(0)}>
                                <span class="text-base notranslate" translate="no">🧮</span> <span>Visos skaičiuoklės (Centras)</span>
                            </button>
                        </div>

                        <!-- 2. AGRO-ORAI -->
                        <div class="space-y-1">
                            <button class="nav-tab-btn w-full text-left px-3.5 py-2.5 rounded-xl font-semibold transition flex items-center gap-3 cursor-pointer ${activeTab === 1 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(1)}>
                                <span class="text-base notranslate" translate="no">🌦️</span> <span>Agro-Orai ir Įšalas</span>
                            </button>
                        </div>

                        <!-- 3. ŪKIS IR LAUKAI (ŠVARI AGRONOMIJA) -->
                        <div class="sidebar-category space-y-1 border border-tractorBorder/60 rounded-xl p-1.5 bg-tractorBg/40">
                            <div class="sidebar-cat-header flex items-center justify-between px-3 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] cursor-pointer hover:text-white transition select-none">
                                <span class="flex items-center gap-1.5"><span class="notranslate" translate="no">🌾</span> <span>Ūkis ir Laukai</span></span>
                                <span class="cat-arrow notranslate text-[10px] transform transition-transform duration-200 ${isUkisActive ? 'rotate-180' : ''}" translate="no">▼</span>
                            </div>
                            <div class="sidebar-cat-body space-y-1 ${isUkisActive ? '' : 'hidden'}">
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 2 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(2)}>
                                    <span class="notranslate" translate="no">🗺️</span> <span>Mano Laukai (Žemėlapis)</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 10 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(10)}>
                                    <span class="notranslate" translate="no">🌱</span> <span>Sėjomainos Planavimas (GAAB 7)</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 3 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(3)}>
                                    <span class="notranslate" translate="no">🧪</span> <span>Tręšimas (VRA Traktoriui)</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 4 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(4)}>
                                    <span class="notranslate" translate="no">🍋</span> <span>Kalkinimas (VRA traktoriui)</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 5 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(5)}>
                                    <span class="notranslate" translate="no">📝</span> <span>Kitos operacijos ir Žurnalas</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 6 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(6)}>
                                    <span class="notranslate" translate="no">📄</span> <span>NMA Žurnalai ir Ataskaitos</span>
                                </button>
                            </div>
                        </div>

                        <!-- 4. 🌟 NAUJA KATEGORIJA: MANO TECHNIKA IR ĮRANGA -->
                        <div class="sidebar-category space-y-1 border border-tractorBorder/60 rounded-xl p-1.5 bg-tractorBg/40">
                            <div class="sidebar-cat-header flex items-center justify-between px-3 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] cursor-pointer hover:text-white transition select-none">
                                <span class="flex items-center gap-1.5"><span class="notranslate" translate="no">🚜</span> <span>Mano Technika ir Įranga</span></span>
                                <span class="cat-arrow notranslate text-[10px] transform transition-transform duration-200 ${isTechnikaActive ? 'rotate-180' : ''}" translate="no">▼</span>
                            </div>
                            <div class="sidebar-cat-body space-y-1 ${isTechnikaActive ? '' : 'hidden'}">
                                <button class="nav-tab-btn admin-only-nav hidden w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 14 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(14)}>
                                    <span class="notranslate" translate="no">🦌</span> <span>Savaeigė technika</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 13 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(13)}>
                                    <span class="notranslate" translate="no">⚡</span> <span>Išmanieji Įrenginiai</span>
                                </button>
                            </div>
                        </div>

                        <!-- 5. BENDRUOMENĖ IR PARKAS (GARAŽAS PALIKTAS ČIA) -->
                        <div class="sidebar-category space-y-1 border border-tractorBorder/60 rounded-xl p-1.5 bg-tractorBg/40">
                            <div class="sidebar-cat-header flex items-center justify-between px-3 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] cursor-pointer hover:text-white transition select-none">
                                <span class="flex items-center gap-1.5"><span class="notranslate" translate="no">🤝</span> <span>Bendruomenė ir Parkas</span></span>
                                <span class="cat-arrow notranslate text-[10px] transform transition-transform duration-200 ${isBendruomeneActive ? 'rotate-180' : ''}" translate="no">▼</span>
                            </div>
                            <div class="sidebar-cat-body space-y-1 ${isBendruomeneActive ? '' : 'hidden'}">
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 11 ? 'bg-tractorPrimary text-white shadow' : 'text-amber-400 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(11)}>
                                    <span class="notranslate" translate="no">🏆</span> <span>Pasėlių Lyga (TOP 10)</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 12 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(12)}>
                                    <span class="notranslate" translate="no">🎉</span> <span>Agro-Renginiai ir Šventės</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 7 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(7)}>
                                    <span class="notranslate" translate="no">🚨</span> <span>SOS Pagalba kaimynams</span>
                                </button>
                                <button class="nav-tab-btn w-full text-left px-3 py-2 rounded-lg font-semibold transition flex items-center gap-2.5 cursor-pointer ${activeTab === 8 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(8)}>
                                    <span class="notranslate" translate="no">🔧</span> <span>Turima technika (Garažas)</span>
                                </button>
                            </div>
                        </div>

                        <!-- 6. SISTEMA -->
                        <div class="space-y-1">
                            <button class="nav-tab-btn w-full text-left px-3.5 py-2.5 rounded-xl font-semibold transition flex items-center gap-3 cursor-pointer ${activeTab === 9 ? 'bg-tractorPrimary text-white shadow' : 'text-slate-300 hover:text-white hover:bg-tractorCard'}" ${getNavClickAction(9)}>
                                <span class="text-base notranslate" translate="no">⚙️</span> <span>Nustatymai</span>
                            </button>
                        </div>

                    </nav>
                </div>

                <div class="border-t border-tractorBorder/70 pt-4 space-y-2.5">
                    <div id="auth-sidebar-box" class="bg-tractorBg border border-tractorBorder/60 p-3 rounded-xl text-center space-y-2">
                        <p class="text-[11px] text-slate-400">Esate neprisijungęs</p>
                        <button class="login-trigger-btn w-full py-2 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white text-xs font-bold rounded-lg shadow transition cursor-pointer">
                            Prisijungti su Google
                        </button>
                    </div>
                    <button type="button" onclick="window.openJurgisContactModal && window.openJurgisContactModal()" class="w-full py-2 px-3 bg-tractorBg/60 hover:bg-tractorCard border border-tractorBorder/60 rounded-xl text-[11px] font-bold text-slate-400 hover:text-green-500 transition cursor-pointer flex items-center justify-center gap-1.5">
                        <span class="notranslate" translate="no">✉️</span> <span>Kontaktai</span>
                    </button>
                </div>
            </aside>
        `;

        setTimeout(() => {
            document.querySelectorAll('.sidebar-cat-header').forEach(header => {
                header.onclick = function() {
                    const body = this.nextElementSibling;
                    const arrow = this.querySelector('.cat-arrow');
                    body.classList.toggle('hidden');
                    arrow.classList.toggle('rotate-180');
                };
            });
        }, 50);
    }

    // 2. MOBILI VIRŠUTINĖ JUOSTA (su ⚙️ Nustatymais viršuje!)
    if (mobileHeaderContainer) {
        mobileHeaderContainer.innerHTML = `
            <div class="bg-tractorSurface border-b border-tractorBorder w-full px-3 py-2.5 flex justify-between items-center relative z-[150] shadow-sm shrink-0">
                <a href="index.html" class="flex items-center gap-1.5">
                    <span class="text-lg notranslate" translate="no">🚜</span>
                    <span class="font-oswald text-lg font-bold tracking-wider text-green-500 notranslate" translate="no">JURGISAGRO</span>
                </a>
                <div class="flex items-center gap-1">
                    <select class="lang-switcher-select notranslate h-7 px-1 bg-tractorBg border border-tractorBorder rounded-lg text-[10px] font-bold outline-none cursor-pointer" translate="no" style="color: var(--text-main);" title="Kalba / Language">
                        <option value="lt">LT</option>
                        <option value="en">EN</option>
                        <option value="lv">LV</option>
                        <option value="et">ET</option>
                    </select>
                    <button id="help-btn-mobile" class="px-2 py-1 bg-tractorBg border border-tractorBorder rounded-lg text-xs font-bold" title="Pagalba">
                        <span class="notranslate" translate="no">📖</span>
                    </button>
                    <button class="btn-theme-toggle px-2 py-1 bg-tractorBg border border-tractorBorder rounded-lg text-xs font-bold">
                        <span class="theme-toggle-icon notranslate" translate="no">☀️</span>
                    </button>
                    <button id="btn-mobile-settings-nav" class="nav-tab-btn px-2 py-1 bg-tractorBg border border-tractorBorder rounded-lg text-xs font-bold ${activeTab === 9 ? 'bg-tractorPrimary text-white' : ''}" ${getNavClickAction(9)} title="Nustatymai">
                        <span class="notranslate" translate="no">⚙️</span>
                    </button>
                    <div id="auth-status-mobile">
                        <button class="login-trigger-btn px-2 py-1 bg-tractorPrimary text-white rounded-lg text-[11px] font-bold">
                            Prisijungti
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 3. MOBILI APATINĖ JUOSTA (5 aiškūs mygtukai: Skaičiuoklės | Orai | Laukai | Technika | Bendruomenė)
    if (mobileNavContainer) {
        mobileNavContainer.innerHTML = `
            <nav class="fixed bottom-0 left-0 right-0 bg-tractorSurface border-t border-tractorBorder h-16 px-1.5 flex justify-around items-center z-50 shadow-2xl">
                <button id="btn-mobile-skaiciuokles-menu" class="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition cursor-pointer ${activeTab === 0 ? 'text-white bg-tractorPrimary shadow' : 'text-slate-300 hover:text-white'}">
                    <span class="text-base notranslate" translate="no">🧮</span>
                    <span class="mt-0.5 font-bold text-[9px] leading-none">Skaičiuoklės</span>
                </button>

                <button id="btn-mobile-weather-nav" class="nav-tab-btn flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition cursor-pointer ${activeTab === 1 ? 'text-white bg-tractorPrimary shadow' : 'text-slate-300 hover:text-white'}" ${getNavClickAction(1)}>
                    <span class="text-base notranslate" translate="no">🌦️</span>
                    <span class="mt-0.5 font-bold text-[9px] leading-none">Orai</span>
                </button>
                
                <button id="btn-mobile-ukis-menu" class="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition cursor-pointer ${isUkisActive ? 'text-white bg-tractorPrimary shadow' : 'text-slate-300 hover:text-white'}">
                    <span class="text-base notranslate" translate="no">🌾</span>
                    <span class="mt-0.5 font-bold text-[9px] leading-none">Laukai</span>
                </button>

                <button id="btn-mobile-technika-menu" class="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition cursor-pointer ${isTechnikaActive ? 'text-white bg-tractorPrimary shadow' : 'text-slate-300 hover:text-white'}">
                    <span class="text-base notranslate" translate="no">🚜</span>
                    <span class="mt-0.5 font-bold text-[9px] leading-none">Technika</span>
                </button>

                <button id="btn-mobile-bendruomene-menu" class="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition cursor-pointer ${isBendruomeneActive ? 'text-white bg-tractorPrimary shadow' : 'text-slate-300 hover:text-white'}">
                    <span class="text-base notranslate" translate="no">🤝</span>
                    <span class="mt-0.5 font-bold text-[9px] leading-none">Bendruomenė</span>
                </button>
            </nav>

            <!-- SKAIČIUOKLIŲ LAPAS -->
            <div id="mobile-skaiciuokles-sheet" class="fixed inset-0 bg-black/80 z-[150] hidden flex flex-col justify-end backdrop-blur-sm transition-all">
                <div class="bg-tractorSurface border-t border-tractorBorder p-6 rounded-t-3xl space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl notranslate" translate="no">🧮</span>
                            <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">Visos Skaičiuoklės</h3>
                        </div>
                        <button id="btn-close-skaiciuokles-sheet" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer notranslate" translate="no">✕</button>
                    </div>
                    <div class="grid grid-cols-1 gap-2 text-xs">
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-electricity-calc">
                            <span class="notranslate" translate="no">⚡</span> <span>Nord Pool elektros birža (Pavalandžiui)</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-matif-calc">
                            <span class="notranslate" translate="no">📈</span> <span>MATIF birža (Paryžius – gyvi grafikai)</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-grain-calc">
                            <span class="notranslate" translate="no">🌾</span> <span>Grūdų supirkimas (Elevatoriai su logistika)</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-diesel-calc">
                            <span class="notranslate" translate="no">⛽</span> <span>Dyzelinas / Gazolas (52 tiekėjų bazės)</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-storage-calc">
                            <span class="notranslate" translate="no">🌾</span> <span>Grūdų sandėlis ir bokštų ventiliavimas (EMC)</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-nma-calc">
                            <span class="notranslate" translate="no">📜</span> <span>NMA terminai ir draudimai</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-seed-calc">
                            <span class="notranslate" translate="no">🌱</span> <span>Sėjos normos ir MTG</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-cover-calc">
                            <span class="notranslate" translate="no">🌿</span> <span>Tarpinių pasėlių (posėlių) mišiniai</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-combine-calc">
                            <span class="notranslate" translate="no">🚜</span> <span>Kombaino nuostoliai</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-spray-calc">
                            <span class="notranslate" translate="no">💦</span> <span>Purkštuvo bako maišymas</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-fert-calc">
                            <span class="notranslate" translate="no">🧪</span> <span>NPK ir azoto savikaina</span>
                        </button>
                        <button class="mobile-calc-trigger text-left p-3 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer" data-target="btn-open-barometer-calc">
                            <span class="notranslate" translate="no">🧭</span> <span>Trąšų kainų radaras ir barometras</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 🌾 LAUKAI IR AGRONOMIJA LAPAS -->
            <div id="mobile-ukis-sheet" class="fixed inset-0 bg-black/80 z-[150] hidden flex flex-col justify-end backdrop-blur-sm transition-all">
                <div class="bg-tractorSurface border-t border-tractorBorder p-6 rounded-t-3xl space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl notranslate" translate="no">🌾</span>
                            <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">Ūkis ir Laukai</h3>
                        </div>
                        <button id="btn-close-ukis-sheet" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer notranslate" translate="no">✕</button>
                    </div>
                    <div class="grid grid-cols-1 gap-2.5 text-xs">
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 2 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(2)}>
                            <span class="text-base notranslate" translate="no">🗺️</span> <span>Mano Laukai (Žemėlapis)</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 10 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(10)}>
                            <span class="text-base notranslate" translate="no">🌱</span> <span>Sėjomainos Planavimas (GAAB 7)</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 3 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(3)}>
                            <span class="text-base notranslate" translate="no">🧪</span> <span>Tręšimas (VRA Traktoriui)</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 4 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(4)}>
                            <span class="text-base notranslate" translate="no">🍋</span> <span>Kalkinimas (VRA traktoriui)</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 5 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(5)}>
                            <span class="text-base notranslate" translate="no">📝</span> <span>Kitos operacijos ir Žurnalas</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 6 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(6)}>
                            <span class="text-base notranslate" translate="no">📄</span> <span>NMA Žurnalai ir Ataskaitos</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 🚜 NAUJAS MOBILUS LAPAS: MANO TECHNIKA IR ĮRANGA -->
            <div id="mobile-technika-sheet" class="fixed inset-0 bg-black/80 z-[150] hidden flex flex-col justify-end backdrop-blur-sm transition-all">
                <div class="bg-tractorSurface border-t border-tractorBorder p-6 rounded-t-3xl space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl notranslate" translate="no">🚜</span>
                            <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">Mano Technika ir Įranga</h3>
                        </div>
                        <button id="btn-close-technika-sheet" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer notranslate" translate="no">✕</button>
                    </div>
                    <div class="grid grid-cols-1 gap-2.5 text-xs">
                        <button class="nav-tab-btn admin-only-nav hidden text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 14 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(14)}>
                            <span class="text-base notranslate" translate="no">🦌</span> <span>Savaeigė technika</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 13 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(13)}>
                            <span class="text-base notranslate" translate="no">⚡</span> <span>Išmanieji Įrenginiai</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 🤝 BENDRUOMENĖ IR PARKAS LAPAS (GARAŽAS PALIKTAS ČIA) -->
            <div id="mobile-bendruomene-sheet" class="fixed inset-0 bg-black/80 z-[150] hidden flex flex-col justify-end backdrop-blur-sm transition-all">
                <div class="bg-tractorSurface border-t border-tractorBorder p-6 rounded-t-3xl space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
                    <div class="flex justify-between items-center border-b border-tractorBorder/70 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl notranslate" translate="no">🤝</span>
                            <h3 class="font-oswald text-lg font-bold text-white uppercase tracking-wider">Bendruomenė ir Parkas</h3>
                        </div>
                        <button id="btn-close-bendruomene-sheet" class="text-slate-400 hover:text-white text-xl font-bold cursor-pointer notranslate" translate="no">✕</button>
                    </div>
                    <div class="grid grid-cols-1 gap-2.5 text-xs">
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-amber-400 transition cursor-pointer ${activeTab === 11 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(11)}>
                            <span class="text-base notranslate" translate="no">🏆</span> <span>Pasėlių Lyga (TOP 10)</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 12 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(12)}>
                            <span class="text-base notranslate" translate="no">🎉</span> <span>Agro-Renginiai ir Šventės</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 7 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(7)}>
                            <span class="text-base notranslate" translate="no">🚨</span> <span>SOS Pagalba kaimynams</span>
                        </button>
                        <button class="nav-tab-btn text-left p-3.5 rounded-xl bg-tractorBg hover:bg-tractorPrimary/20 border border-tractorBorder flex items-center gap-3 font-bold text-white transition cursor-pointer ${activeTab === 8 ? 'border-tractorPrimary bg-tractorPrimary/20 text-green-400' : ''}" ${getNavClickAction(8)}>
                            <span class="text-base notranslate" translate="no">🔧</span> <span>Turima technika (Garažas)</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const skaiciuoklesBtn = document.getElementById('btn-mobile-skaiciuokles-menu');
            const skaiciuoklesSheet = document.getElementById('mobile-skaiciuokles-sheet');
            const closeSkaiciuoklesBtn = document.getElementById('btn-close-skaiciuokles-sheet');

            if (skaiciuoklesBtn && skaiciuoklesSheet) {
                skaiciuoklesBtn.onclick = () => skaiciuoklesSheet.classList.remove('hidden');
            }
            if (closeSkaiciuoklesBtn && skaiciuoklesSheet) {
                closeSkaiciuoklesBtn.onclick = () => skaiciuoklesSheet.classList.add('hidden');
            }
            skaiciuoklesSheet?.addEventListener('click', (e) => {
                if (e.target === skaiciuoklesSheet) skaiciuoklesSheet.classList.add('hidden');
            });

            document.querySelectorAll('.mobile-calc-trigger').forEach(btn => {
                btn.onclick = () => {
                    skaiciuoklesSheet?.classList.add('hidden');
                    const hubBtn = document.querySelector('[data-tab="0"]');
                    if (hubBtn) hubBtn.click();

                    const targetId = btn.getAttribute('data-target');
                    setTimeout(() => {
                        document.getElementById(targetId)?.click();
                    }, 100);
                };
            });

            const ukisBtn = document.getElementById('btn-mobile-ukis-menu');
            const ukisSheet = document.getElementById('mobile-ukis-sheet');
            const closeUkisBtn = document.getElementById('btn-close-ukis-sheet');

            if (ukisBtn && ukisSheet) ukisBtn.onclick = () => ukisSheet.classList.remove('hidden');
            if (closeUkisBtn && ukisSheet) closeUkisBtn.onclick = () => ukisSheet.classList.add('hidden');
            ukisSheet?.addEventListener('click', (e) => { if (e.target === ukisSheet) ukisSheet.classList.add('hidden'); });

            const techBtn = document.getElementById('btn-mobile-technika-menu');
            const techSheet = document.getElementById('mobile-technika-sheet');
            const closeTechBtn = document.getElementById('btn-close-technika-sheet');

            if (techBtn && techSheet) techBtn.onclick = () => techSheet.classList.remove('hidden');
            if (closeTechBtn && techSheet) closeTechBtn.onclick = () => techSheet.classList.add('hidden');
            techSheet?.addEventListener('click', (e) => { if (e.target === techSheet) techSheet.classList.add('hidden'); });

            const bendruomeneBtn = document.getElementById('btn-mobile-bendruomene-menu');
            const bendruomeneSheet = document.getElementById('mobile-bendruomene-sheet');
            const closeBendruomeneBtn = document.getElementById('btn-close-bendruomene-sheet');

            if (bendruomeneBtn && bendruomeneSheet) bendruomeneBtn.onclick = () => bendruomeneSheet.classList.remove('hidden');
            if (closeBendruomeneBtn && bendruomeneSheet) closeBendruomeneBtn.onclick = () => bendruomeneSheet.classList.add('hidden');
            bendruomeneSheet?.addEventListener('click', (e) => { if (e.target === bendruomeneSheet) bendruomeneSheet.classList.add('hidden'); });

            document.querySelectorAll('#mobile-ukis-sheet .nav-tab-btn, #mobile-technika-sheet .nav-tab-btn, #mobile-bendruomene-sheet .nav-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    ukisSheet?.classList.add('hidden');
                    techSheet?.classList.add('hidden');
                    bendruomeneSheet?.classList.add('hidden');
                });
            });
        }, 50);
    }
}