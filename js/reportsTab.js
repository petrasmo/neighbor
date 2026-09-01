// js/reportsTab.js
import { generateOfficialReport, exportReportToExcel } from './fieldsReport.js';

export function initReportsTab(userFieldsList, userData) {
    const container = document.getElementById('view-tab-reports');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6 max-w-5xl mx-auto w-full">
            
            <!-- HEADERIS -->
            <div class="border-b border-tractorBorder pb-4">
                <h2 class="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <span>📄</span> Ūkio Ataskaitos ir NMA Žurnalai
                </h2>
                <p class="text-xs md:text-sm text-slate-300 mt-1">
                    Generuokite oficialios formos LR ŽŪM / NMA ataskaitas patikroms PDF arba Excel formatu vienu paspaudimu.
                </p>
            </div>

            <!-- 3 ATASKAITŲ KORTELĖS -->
            <div class="space-y-4">
                
                <!-- 1. AUGALŲ APSAUGOS ŽURNALAS -->
                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-7 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-500 transition">
                    <div class="space-y-1.5 flex-1">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">💦</span>
                            <h3 class="text-lg md:text-xl font-bold text-white">Augalų apsaugos produktų (Purškimo) apskaitos žurnalas</h3>
                        </div>
                        <p class="text-xs md:text-sm text-slate-300">
                            Privalomas NMA ir VAT patikroms. Suvestinė su preparatais, normomis, datomis ir apdorotais laukais.
                        </p>
                    </div>

                    <!-- 🌟 PARYŠKINTI RYŠKŪS MYGTUKAI -->
                    <div class="flex items-center gap-3 shrink-0">
                        <button id="tab-btn-pdf-spray" class="h-11 px-5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20 transition cursor-pointer">
                            <span>🖨️</span> <span>PDF / Spausdinti</span>
                        </button>
                        <button id="tab-btn-xls-spray" class="h-11 px-5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-green-600/20 transition cursor-pointer">
                            <span>📊</span> <span>Excel (.XLS)</span>
                        </button>
                    </div>
                </div>

                <!-- 2. TRĄŠŲ ŽURNALAS -->
                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-7 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-500 transition">
                    <div class="space-y-1.5 flex-1">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">🧪</span>
                            <h3 class="text-lg md:text-xl font-bold text-white">Trąšų naudojimo apskaitos žurnalas</h3>
                        </div>
                        <p class="text-xs md:text-sm text-slate-300">
                            Privaloma deklaruojantiems virš 10 ha. Mineralinių trąšų, NPK ir kalkinimo operacijos.
                        </p>
                    </div>

                    <div class="flex items-center gap-3 shrink-0">
                        <button id="tab-btn-pdf-fert" class="h-11 px-5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20 transition cursor-pointer">
                            <span>🖨️</span> <span>PDF / Spausdinti</span>
                        </button>
                        <button id="tab-btn-xls-fert" class="h-11 px-5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-green-600/20 transition cursor-pointer">
                            <span>📊</span> <span>Excel (.XLS)</span>
                        </button>
                    </div>
                </div>

                <!-- 3. SĖJOMAINA IR DERLIUS -->
                <div class="bg-tractorSurface border border-tractorBorder rounded-2xl p-6 md:p-7 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-500 transition">
                    <div class="space-y-1.5 flex-1">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">🌾</span>
                            <h3 class="text-lg md:text-xl font-bold text-white">Sėjomainos, derliaus ir savikainos suvestinė</h3>
                        </div>
                        <p class="text-xs md:text-sm text-slate-300">
                            Visi ūkio laukai, plotai, pasėti augalai, nukultas derlius tonomis ir bendros išlaidos.
                        </p>
                    </div>

                    <div class="flex items-center gap-3 shrink-0">
                        <button id="tab-btn-pdf-rot" class="h-11 px-5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20 transition cursor-pointer">
                            <span>🖨️</span> <span>PDF / Spausdinti</span>
                        </button>
                        <button id="tab-btn-xls-rot" class="h-11 px-5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs md:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-green-600/20 transition cursor-pointer">
                            <span>📊</span> <span>Excel (.XLS)</span>
                        </button>
                    </div>
                </div>

            </div>

        </div>
    `;

    // PDF mygtukai
    document.getElementById('tab-btn-pdf-spray').onclick = () => generateOfficialReport('spray', userFieldsList, userData);
    document.getElementById('tab-btn-pdf-fert').onclick = () => generateOfficialReport('fertilizer', userFieldsList, userData);
    document.getElementById('tab-btn-pdf-rot').onclick = () => generateOfficialReport('rotation', userFieldsList, userData);

    // Excel mygtukai
    document.getElementById('tab-btn-xls-spray').onclick = () => exportReportToExcel('spray', userFieldsList, userData);
    document.getElementById('tab-btn-xls-fert').onclick = () => exportReportToExcel('fertilizer', userFieldsList, userData);
    document.getElementById('tab-btn-xls-rot').onclick = () => exportReportToExcel('rotation', userFieldsList, userData);
}