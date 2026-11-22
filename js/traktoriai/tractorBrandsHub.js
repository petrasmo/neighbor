// js/traktoriai/tractorBrandsHub.js
import { showBottomToast, showDialog } from '../core/ui.js';

export function renderTractorBrandsHubSection(deereState, userFields) {
    const isDeereConnected = deereState?.isConnected && !deereState?.needsOrgConnection;
    const orgName = deereState?.organization?.name || "JurgisAgro";
    const orgId = deereState?.organization?.id || "10592620";
    const deereFieldsCount = (deereState?.fields || []).length;

    const returnUri = encodeURIComponent(`${window.location.origin}/?tab=14&jd=connected`);
    const rawConnUrl = deereState?.connectionsUrl || deereState?.manageConnectionsUrl || "https://connections.deere.com/connections/0oay3prpfukTojw365d7/select-organizations";
    const fullConnUrl = rawConnUrl.includes('?') ? `${rawConnUrl}&redirect_uri=${returnUri}` : `${rawConnUrl}?redirect_uri=${returnUri}`;

    return `
        <div class="space-y-5">
            
            <!-- 5 TECHNIKOS ŠEIMŲ CLOUD INTEGRACIJŲ KORTELĖS -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <!-- 1. JOHN DEERE OPERATIONS CENTER -->
                <div class="bg-tractorSurface border-2 ${isDeereConnected ? 'border-green-500' : 'border-tractorBorder'} rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500 flex items-center justify-center text-2xl shrink-0">🦌</div>
                                <div>
                                    <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">1. John Deere Operations Center™</h3>
                                    <span class="text-xs text-slate-400 block">6R, 7R, 8R, 9R traktoriai • S ir T kombainai (JDLink™)</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isDeereConnected ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}">
                                ${isDeereConnected ? `🟢 Sujungta (ID: ${orgId})` : '🟡 Neprijungta'}
                            </span>
                        </div>

                        <p class="text-xs text-slate-300 leading-relaxed">
                            Tiesioginis dvipusis OAuth2 ryšys: NMA laukų ribų sinchronizavimas, belaidis VRA Shapefile (.ZIP) siuntimas į CommandCenter™ kabiną ir gyva GPS telemetrija.
                        </p>

                        ${deereState?.isConnected ? `
                            <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder flex items-center justify-between text-xs">
                                <span>Organizacija: <strong class="text-green-400">${orgName}</strong></span>
                                <span>Laukai debesyje: <strong class="text-amber-400 font-mono">JurgisAgro: ${userFields.length} | Deere: ${deereFieldsCount}</strong></span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="space-y-2 pt-2 border-t border-tractorBorder/60">
                        <div class="flex flex-wrap gap-2">
                            <button type="button" id="btn-hub-connect-deere" class="flex-1 h-10 bg-tractorPrimary hover:bg-tractorPrimaryHover text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-1.5">
                                <span>🦌</span> <span>${deereState?.isConnected ? 'Perjungti Paskyrą' : 'Prijungti John Deere'}</span>
                            </button>
                            <a href="${fullConnUrl}" target="_blank" class="h-10 px-3.5 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition" style="color: var(--text-main);">
                                <span>🔗</span> <span>Organizacijos leidimai</span>
                            </a>
                        </div>

                        ${isDeereConnected ? `
                            <button type="button" id="btn-hub-push-fields-deere" class="w-full h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
                                <span>📡</span> <span>Sinchronizuoti JurgisAgro laukus į John Deere (${userFields.length} vnt.)</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- 2. CLAAS CONNECT / TELEMATICS -->
                <div class="bg-tractorSurface border-2 border-tractorBorder hover:border-green-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-lime-500/20 border border-lime-500/50 flex items-center justify-center text-2xl shrink-0">🟢</div>
                                <div>
                                    <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">2. CLAAS Connect / Telematics™</h3>
                                    <span class="text-xs text-slate-400 block">Arion, Axion, Xerion traktoriai • Lexion, Trion kombainai</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-lime-500/15 text-lime-400 border border-lime-500/40">
                                🔜 Paruošta integracijai
                            </span>
                        </div>

                        <p class="text-xs text-slate-300 leading-relaxed">
                            CLAAS CEMIS™ 1200 terminalų integracija: ISOXML ir Shapefile VRA žemėlapių perdavimas, kuro sąnaudų ir kombainų derlingumo žemėlapių sinchronizacija.
                        </p>

                        <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder text-[11px] text-slate-400">
                            💡 <strong>Jau veikia dabar:</strong> Skirtuke „2. Darbo Užduotys“ pasirinkę <strong>CLAAS Axion</strong>, vienu paspaudimu gausite paruoštą VRA <code>.ZIP</code> failą CEMIS 1200 terminalui!
                        </div>
                    </div>

                    <div class="pt-2 border-t border-tractorBorder/60">
                        <button type="button" data-coming-brand="CLAAS Connect / Telematics" class="btn-coming-brand-info w-full h-10 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2" style="color: var(--text-main);">
                            <span>🟢</span> <span>Aktyvuoti CLAAS API Ryšį</span>
                        </button>
                    </div>
                </div>

                <!-- 3. AGCO FUSE (FENDT / VALTRA / MASSEY FERGUSON) -->
                <div class="bg-tractorSurface border-2 border-tractorBorder hover:border-emerald-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-2xl shrink-0">🛡️</div>
                                <div>
                                    <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">3. AGCO Fuse® (Fendt • Valtra • Massey Ferguson)</h3>
                                    <span class="text-xs text-slate-400 block">FendtONE™ • Valtra SmartTouch™ • MF Connect™</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                                🔜 Paruošta integracijai
                            </span>
                        </div>

                        <p class="text-xs text-slate-300 leading-relaxed">
                            Vieninga AGCO korporacijos telemetrijos ir TaskDoc™ Server sąsaja visiems <strong>Fendt Vario</strong>, <strong>Valtra (G, N, T, Q, S serijų)</strong> ir <strong>Massey Ferguson (5S–9S)</strong> traktoriams.
                        </p>

                        <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder text-[11px] text-slate-400">
                            💡 <strong>Jau veikia dabar:</strong> Skirtuke „1. Gyva Telemetrija“ ir „2. Darbo Užduotys“ jau galite pasirinkti <strong>Fendt 942 Vario</strong> arba <strong>Valtra T235 Versu</strong>!
                        </div>
                    </div>

                    <div class="pt-2 border-t border-tractorBorder/60">
                        <button type="button" data-coming-brand="AGCO Fuse (Fendt / Valtra / Massey Ferguson)" class="btn-coming-brand-info w-full h-10 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2" style="color: var(--text-main);">
                            <span>🛡️</span> <span>Prijungti Fendt / Valtra / MF Paskyrą</span>
                        </button>
                    </div>
                </div>

                <!-- 4. CNH INDUSTRIAL (CASE IH / NEW HOLLAND / STEYR) -->
                <div class="bg-tractorSurface border-2 border-tractorBorder hover:border-red-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-2xl shrink-0">🔴</div>
                                <div>
                                    <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">4. CNH FieldOps™ (Case IH • New Holland)</h3>
                                    <span class="text-xs text-slate-400 block">AFS Connect™ (Puma, Optum, Magnum) • MyPLM® Connect</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/40">
                                🔜 Paruošta integracijai
                            </span>
                        </div>

                        <p class="text-xs text-slate-300 leading-relaxed">
                            Case IH AFS Pro 1200 ir New Holland IntelliView™ 12 monitorių sinchronizacija: VRA tręšimo žemėlapių ir laukų ribų perdavimas.
                        </p>

                        <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder text-[11px] text-slate-400">
                            💡 <strong>Jau veikia dabar:</strong> Standartinis JurgisAgro Shapefile <code>.ZIP</code> formatas 100% tinka Case IH AFS ir New Holland PLM terminalams per USB.
                        </div>
                    </div>

                    <div class="pt-2 border-t border-tractorBorder/60">
                        <button type="button" data-coming-brand="CNH FieldOps (Case IH / New Holland)" class="btn-coming-brand-info w-full h-10 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2" style="color: var(--text-main);">
                            <span>🔴</span> <span>Prijungti Case IH / New Holland</span>
                        </button>
                    </div>
                </div>

            </div>

            <!-- 5. UNIVERSALUS JURGISAGRO GPS / USB REŽIMAS (VISIEMS TRAKTORIAMS) -->
            <div class="bg-tractorSurface border-2 border-green-500/60 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-start sm:items-center gap-3.5">
                    <div class="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500 flex items-center justify-center text-2xl shrink-0">📱</div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">5. JurgisAgro Universalus GPS & USB Režimas</h3>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/40">
                                🟢 Aktyvus visiems ūkio traktoriams
                            </span>
                        </div>
                        <p class="text-xs text-slate-300 mt-1">
                            Tinka <strong>visiems traktoriams ir barstytuvams</strong> (Amazone, Bogballe, Rauch, Kverneland, Trimble, Mueller-Elektronik, MTZ): atsisiųskite standartinį Shapefile <code>.ZIP</code> į USB raktą arba atsidarykite JurgisAgro planšetėje/telefone tiesiai traktoriaus kabinoje!
                        </p>
                    </div>
                </div>
            </div>

        </div>
    `;
}

export function bindBrandsHubEvents(currentUser, deereState, userFields, onRefreshCallback) {
    document.getElementById('btn-hub-connect-deere')?.addEventListener('click', async () => {
        if (!currentUser) return;
        const btn = document.getElementById('btn-hub-connect-deere');
        if (btn) btn.textContent = "⏳ Nukreipiama į John Deere...";

        try {
            const origin = window.location.origin;
            const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/getJohnDeereAuthUrl?userId=${currentUser.uid}&origin=${encodeURIComponent(origin)}`);
            const data = await res.json();
            if (data && data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            showBottomToast("Klaida: " + err.message, "error");
        }
    });

    document.getElementById('btn-hub-push-fields-deere')?.addEventListener('click', async () => {
        if (!deereState?.organization?.id || deereState.needsOrgConnection) {
            showBottomToast("Pirmiausia patvirtinkite John Deere organizacijos prieigą!", "warning");
            return;
        }
        if (userFields.length === 0) {
            showBottomToast("JurgisAgro sistemoje neturite įbraižytų laukų!", "warning");
            return;
        }

        showBottomToast(`Siunčiama ${userFields.length} laukų į John Deere Operations Center... 📡`, "info");
        try {
            const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/syncFieldsToJohnDeere", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUser.uid,
                    orgId: deereState.organization.id,
                    fields: userFields
                })
            });
            const data = await res.json();
            if (data.success) {
                showBottomToast(`✅ Sukurta laukų John Deere: ${data.createdCount} (Dublikatų praleista: ${data.skippedCount})`);
                if (typeof onRefreshCallback === 'function') onRefreshCallback();
            } else {
                showBottomToast("Klaida: " + data.error, "error");
            }
        } catch (err) {
            showBottomToast("Ryšio klaida: " + err.message, "error");
        }
    });

    document.querySelectorAll('.btn-coming-brand-info').forEach(btn => {
        btn.addEventListener('click', () => {
            const brand = btn.getAttribute('data-coming-brand');
            showDialog(
                `${brand} Cloud API`,
                `Tiesioginis <strong>${brand}</strong> debesies OAuth2 sujungimas jau suprojektuotas JurgisAgro architektūroje ir bus aktyvuotas gavus gamintojo API raktus.<br><br>💡 <strong>Jau dabar:</strong> Skirtuke <strong>„2. Darbo Užduotys (Dispečerinė)“</strong> galite pasirinkti šios markės traktorių, priskirti jam darbus, generuoti VRA Shapefile <code>.ZIP</code> failus terminalui ir automatiškai pildyti NMA žurnalus!`,
                "🚜"
            );
        });
    });
}