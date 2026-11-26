// js/traktoriai/tractorBrandsHub.js
import { showBottomToast, showDialog } from '../core/ui.js';

let phoneBeaconInterval = null;
let activeBeaconImei = null;

export function renderTractorBrandsHubSection(deereState, userFields) {
    const isDeereConnected = deereState?.isConnected && !deereState?.needsOrgConnection;
    const orgName = deereState?.organization?.name || "JurgisAgro";
    const orgId = deereState?.organization?.id || "10592620";
    const deereFieldsCount = (deereState?.fields || []).length;

    const returnUri = encodeURIComponent(`${window.location.origin}/?tab=14&jd=connected`);
    const rawConnUrl = deereState?.connectionsUrl || deereState?.manageConnectionsUrl || "https://connections.deere.com/connections/0oay3prpfukTojw365d7/select-organizations";
    const fullConnUrl = rawConnUrl.includes('?') ? `${rawConnUrl}&redirect_uri=${returnUri}` : `${rawConnUrl}?redirect_uri=${returnUri}`;

    const jurgisTractors = (deereState?.machines || []).filter(m => m.isJurgisGps);

    const jurgisListHtml = jurgisTractors.length === 0
        ? `<div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder text-xs text-slate-400">Dar nepridėtas nė vienas JurgisAgro GPS trekeris. Paspauskite mygtuką dešinėje ir pridėkite savo „Belarus“, „Zetor“ ar kitą traktorių!</div>`
        : jurgisTractors.map(t => {
            const isBeaconing = activeBeaconImei === t.imei;
            return `
                <div class="p-3.5 bg-tractorBg rounded-xl border ${isBeaconing ? 'border-green-500' : 'border-tractorBorder'} flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2.5">
                        <span class="text-2xl">${t.category === 'Combine' ? '🌾' : '🚜'}</span>
                        <div>
                            <strong class="font-bold text-sm block" style="color: var(--text-main);">${t.name} (${t.model})</strong>
                            <span class="font-mono text-[11px] text-green-400">IMEI / ID: ${t.imei} • Moto-val.: ${t.engineHours} h ${t.location ? `• 📍 ${t.location.lat.toFixed(5)}, ${t.location.lng.toFixed(5)}` : '• Laukiama pirmo GPS signalo'}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" data-beacon-imei="${t.imei}" class="btn-toggle-phone-beacon px-3 py-1.5 rounded-lg font-extrabold text-[11px] cursor-pointer transition ${isBeaconing ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-tractorPrimary text-white'}">
                            ${isBeaconing ? '⏹️ Stabdyti Telefono GPS' : '📱 Testuoti su Telefono GPS'}
                        </button>
                        <button type="button" data-del-tracker="${t.id}" class="btn-delete-jurgis-tracker px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg font-bold cursor-pointer transition">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    return `
        <div class="space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <!-- 1. JOHN DEERE -->
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
                            ${deereState?.isConnected ? `
                                <button type="button" id="btn-hub-disconnect-deere" class="h-10 px-3.5 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5">
                                    <span>🔌</span> <span>Atjungti</span>
                                </button>
                            ` : ''}
                        </div>
                        ${isDeereConnected ? `
                            <button type="button" id="btn-hub-push-fields-deere" class="w-full h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2">
                                <span>📡</span> <span>Sinchronizuoti JurgisAgro laukus į John Deere (${userFields.length} vnt.)</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- 2. CLAAS -->
                <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-lime-500/20 border border-lime-500/50 flex items-center justify-center text-2xl shrink-0">🟢</div>
                                <div>
                                    <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">2. CLAAS Connect / Telematics™</h3>
                                    <span class="text-xs text-slate-400 block">Arion, Axion, Xerion traktoriai • Lexion, Trion kombainai</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-lime-500/15 text-lime-400 border border-lime-500/40">🔜 Paruošta integracijai</span>
                        </div>
                        <p class="text-xs text-slate-300 leading-relaxed">CLAAS CEMIS™ 1200 terminalų integracija: ISOXML ir Shapefile VRA žemėlapių perdavimas bei telemetrija.</p>
                    </div>
                    <div class="pt-2 border-t border-tractorBorder/60">
                        <button type="button" data-coming-brand="CLAAS Connect / Telematics" class="btn-coming-brand-info w-full h-10 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer" style="color: var(--text-main);">🟢 Aktyvuoti CLAAS API Ryšį</button>
                    </div>
                </div>

                <!-- 3. AGCO -->
                <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-2xl shrink-0">🛡️</div>
                                <div>
                                    <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">3. AGCO Fuse® (Fendt • Valtra • Massey Ferguson)</h3>
                                    <span class="text-xs text-slate-400 block">FendtONE™ • Valtra SmartTouch™ • MF Connect™</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">🔜 Paruošta integracijai</span>
                        </div>
                        <p class="text-xs text-slate-300 leading-relaxed">Vieninga AGCO korporacijos telemetrijos ir TaskDoc™ Server sąsaja Fendt, Valtra ir Massey Ferguson traktoriams.</p>
                    </div>
                    <div class="pt-2 border-t border-tractorBorder/60">
                        <button type="button" data-coming-brand="AGCO Fuse (Fendt / Valtra / MF)" class="btn-coming-brand-info w-full h-10 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer" style="color: var(--text-main);">🛡️ Prijungti Fendt / Valtra / MF</button>
                    </div>
                </div>

                <!-- 4. CNH -->
                <div class="bg-tractorSurface border-2 border-tractorBorder rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                    <div class="space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-2xl shrink-0">🔴</div>
                                <div>
                                    <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">4. CNH FieldOps™ (Case IH • New Holland)</h3>
                                    <span class="text-xs text-slate-400 block">AFS Connect™ (Puma, Optum, Magnum) • MyPLM® Connect</span>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/40">🔜 Paruošta integracijai</span>
                        </div>
                        <p class="text-xs text-slate-300 leading-relaxed">Case IH AFS Pro 1200 ir New Holland IntelliView™ 12 monitorių sinchronizacija.</p>
                    </div>
                    <div class="pt-2 border-t border-tractorBorder/60">
                        <button type="button" data-coming-brand="CNH FieldOps (Case IH / New Holland)" class="btn-coming-brand-info w-full h-10 bg-tractorBg hover:bg-tractorCard border border-tractorBorder rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer" style="color: var(--text-main);">🔴 Prijungti Case IH / New Holland</button>
                    </div>
                </div>
            </div>

            <!-- 🚜 5. JURGISAGRO UNIVERSALUS GPS TREKERIS (BELARUS / MTZ / ZETOR / TELTONIKA FMC920) -->
            <div class="bg-tractorSurface border-2 border-green-500 rounded-2xl p-5 shadow-xl space-y-4">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tractorBorder/60 pb-4">
                    <div class="flex items-start sm:items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500 flex items-center justify-center text-2xl shrink-0">📡</div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">5. JurgisAgro Universalus GPS & Telemetrija (Belarus • MTZ • Zetor • Teltonika 4G)</h3>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/40">
                                    🟢 Veikia su Teltonika FMC920 ir Telefonu
                                </span>
                            </div>
                            <p class="text-xs text-slate-300 mt-1">
                                Prijunkite lietuvišką <strong>Teltonika FMC920</strong> 4G GPS trekerį (arba išmanųjį telefoną kabinoje) prie bet kurio <strong>Belarus (MTZ)</strong> ar kito traktoriaus – matysite gyvą vietą žemėlapyje, greitį, akumuliatoriaus įtampą (V) ir tikras moto-valandas!
                            </p>
                        </div>
                    </div>

                    <button type="button" id="btn-open-jurgis-gps-modal" style="background-color: #2E7D32; color: #FFFFFF;" class="h-11 px-5 hover:opacity-90 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg cursor-pointer transition shrink-0 flex items-center gap-2">
                        <span>➕</span> <span>Pridėti Traktorių (GPS Trekerį)</span>
                    </button>
                </div>

                <!-- PRIJUNGTŲ JURGISAGRO GPS TRAKTORIŲ SĄRAŠAS -->
                <div class="space-y-2">
                    ${jurgisListHtml}
                </div>

                <div class="p-3 bg-tractorBg rounded-xl border border-tractorBorder text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                    <span>🔗 <strong>Serverio Webhook adresas (Teltonika / Flespi / Traccar):</strong></span>
                    <code class="font-mono text-green-400 bg-tractorSurface px-2.5 py-1 rounded border border-tractorBorder select-all">https://us-central1-neighborpm-b9968.cloudfunctions.net/jurgisGpsWebhook</code>
                </div>
            </div>

            <!-- MODALAS: PRIDĖTI JURGISAGRO GPS TRAKTORIŲ (BELARUS / MTZ) -->
            <div id="modal-add-jurgis-gps" class="fixed inset-0 bg-black/80 z-[10005] hidden flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="bg-tractorSurface border-2 border-tractorPrimary rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
                    <div class="flex items-center justify-between border-b border-tractorBorder pb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">🚜</span>
                            <h3 class="font-oswald text-lg font-bold uppercase" style="color: var(--text-main);">Prijungti Traktorių (JurgisAgro GPS)</h3>
                        </div>
                        <button type="button" id="btn-close-jurgis-gps-modal" class="text-slate-400 hover:text-white text-2xl font-bold cursor-pointer">&times;</button>
                    </div>

                    <form id="form-add-jurgis-gps" class="space-y-3">
                        <div class="space-y-1">
                            <label class="font-bold uppercase text-slate-300 block">Traktoriaus pavadinimas ūkyje *</label>
                            <input id="jgps-name" type="text" required value="Belarus MTZ-82.1" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-bold outline-none" style="color: var(--text-main);">
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <div class="space-y-1">
                                <label class="font-bold uppercase text-slate-300 block">Modelis ir Galia</label>
                                <input id="jgps-model" type="text" value="MTZ-82.1 (82 AG)" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 outline-none" style="color: var(--text-main);">
                            </div>
                            <div class="space-y-1">
                                <label class="font-bold uppercase text-slate-300 block">Esamos Moto-valandos</label>
                                <input id="jgps-hours" type="number" step="0.1" value="1420.0" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-mono font-bold outline-none" style="color: var(--text-main);">
                            </div>
                        </div>
                        <div class="space-y-1">
                            <label class="font-bold uppercase text-green-400 block">Teltonika FMC920 IMEI (arba unikalus ID) *</label>
                            <input id="jgps-imei" type="text" required value="352093089451208" class="w-full h-10 bg-tractorBg border border-tractorBorder rounded-xl px-3 font-mono font-bold outline-none" style="color: var(--text-main);">
                            <span class="text-[10px] text-slate-400 block">15 skaitmenų IMEI kodas, užrašytas ant Teltonika FMC920 korpuso.</span>
                        </div>
                        <button type="submit" style="background-color: #2E7D32; color: #FFFFFF;" class="w-full h-11 hover:opacity-90 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer transition">
                            💾 Išsaugoti ir Aktyvuoti Traktorių
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

export function bindBrandsHubEvents(currentUser, deereState, userFields, onRefreshCallback) {
    const connectBtn = document.getElementById('btn-hub-connect-deere');
    if (connectBtn) {
        connectBtn.onclick = async () => {
            if (!currentUser) return;
            connectBtn.textContent = "⏳ Nukreipiama į John Deere...";
            try {
                const origin = window.location.origin;
                const res = await fetch(`https://us-central1-neighborpm-b9968.cloudfunctions.net/getJohnDeereAuthUrl?userId=${currentUser.uid}&origin=${encodeURIComponent(origin)}`);
                const data = await res.json();
                if (data?.url) window.location.href = data.url;
            } catch (err) {
                showBottomToast("Klaida: " + err.message, "error");
            }
        };
    }

    document.getElementById('btn-hub-disconnect-deere')?.addEventListener('click', () => {
        if (!currentUser) return;
        showDialog("Atjungti John Deere paskyrą?", "Ar tikrai norite atjungti savo John Deere paskyrą?", "🔌", async () => {
            const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/disconnectJohnDeere", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser.uid })
            });
            const data = await res.json();
            if (data.success) {
                showBottomToast("🔌 John Deere paskyra atjungta!");
                if (typeof onRefreshCallback === 'function') onRefreshCallback();
            }
        }, true);
    });

    document.getElementById('btn-hub-push-fields-deere')?.addEventListener('click', async () => {
        if (!deereState?.organization?.id || deereState.needsOrgConnection) return;
        showBottomToast(`Siunčiama ${userFields.length} laukų į John Deere... 📡`, "info");
        try {
            const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/syncFieldsToJohnDeere", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser.uid, orgId: deereState.organization.id, fields: userFields })
            });
            const data = await res.json();
            if (data.success) {
                showBottomToast(`✅ Sukurta/atkurta laukų John Deere: ${data.createdCount} (Dublikatų: ${data.skippedCount})`);
                if (typeof onRefreshCallback === 'function') onRefreshCallback();
            }
        } catch (err) {
            showBottomToast("Klaida: " + err.message, "error");
        }
    });

    document.querySelectorAll('.btn-coming-brand-info').forEach(btn => {
        btn.onclick = () => {
            const brand = btn.getAttribute('data-coming-brand');
            showDialog(`${brand} Cloud API`, `Tiesioginis <strong>${brand}</strong> debesies OAuth2 sujungimas paruoštas ir bus aktyvuotas gavus gamintojo API raktus.`, "🚜");
        };
    });

    const gpsModal = document.getElementById('modal-add-jurgis-gps');
    document.getElementById('btn-open-jurgis-gps-modal')?.addEventListener('click', () => gpsModal?.classList.remove('hidden'));
    document.getElementById('btn-close-jurgis-gps-modal')?.addEventListener('click', () => gpsModal?.classList.add('hidden'));

    document.getElementById('form-add-jurgis-gps')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const name = document.getElementById('jgps-name')?.value.trim();
        const model = document.getElementById('jgps-model')?.value.trim();
        const engineHours = parseFloat(document.getElementById('jgps-hours')?.value || '0');
        const imei = document.getElementById('jgps-imei')?.value.trim();

        const res = await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/registerJurgisGpsTracker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.uid, name, model, engineHours, imei })
        });
        const data = await res.json();
        if (data.success) {
            gpsModal?.classList.add('hidden');
            showBottomToast(`🚜 „${name}“ (IMEI: ${imei}) sėkmingai prijungtas!`);
            if (typeof onRefreshCallback === 'function') onRefreshCallback();
        } else {
            showBottomToast("Klaida: " + data.error, "error");
        }
    });

    document.querySelectorAll('.btn-delete-jurgis-tracker').forEach(btn => {
        btn.onclick = () => {
            const docId = btn.getAttribute('data-del-tracker');
            showDialog("Pašalinti GPS trekerį?", "Ar tikrai norite pašalinti šį traktorių iš JurgisAgro GPS sąrašo?", "🗑️", async () => {
                await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/deleteJurgisGpsTracker", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: currentUser.uid, docId })
                });
                showBottomToast("🗑️ Traktorius pašalintas.");
                if (typeof onRefreshCallback === 'function') onRefreshCallback();
            }, true);
        };
    });

    document.querySelectorAll('.btn-toggle-phone-beacon').forEach(btn => {
        btn.onclick = () => {
            const imei = btn.getAttribute('data-beacon-imei');
            if (activeBeaconImei === imei) {
                clearInterval(phoneBeaconInterval);
                phoneBeaconInterval = null;
                activeBeaconImei = null;
                showBottomToast("⏹️ Telefono GPS siųstuvas sustabdytas.");
                if (typeof onRefreshCallback === 'function') onRefreshCallback();
                return;
            }

            if (!navigator.geolocation) {
                showBottomToast("Jūsų naršyklė nepalaiko GPS.", "error");
                return;
            }

            activeBeaconImei = imei;
            showBottomToast(`📡 Telefonas tapo „${imei}“ GPS trekeriu! Siunčiamos gyvos koordinatės...`);

            const sendPing = () => {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    await fetch("https://us-central1-neighborpm-b9968.cloudfunctions.net/jurgisGpsWebhook", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            imei: imei,
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            speedKmh: pos.coords.speed ? pos.coords.speed * 3.6 : 8.5,
                            heading: pos.coords.heading || 90,
                            voltageV: 14.2,
                            ignition: true
                        })
                    });
                    if (typeof onRefreshCallback === 'function') onRefreshCallback();
                });
            };

            sendPing();
            if (phoneBeaconInterval) clearInterval(phoneBeaconInterval);
            phoneBeaconInterval = setInterval(sendPing, 6000);
        };
    });
}