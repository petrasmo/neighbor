// js/fieldsReport.js

/**
 * 🖨️ OFICIALUS PDF / A4 SPAUSDINIMAS
 */
export function generateOfficialReport(reportType, userFieldsList, userData) {
    if (!userFieldsList || userFieldsList.length === 0) {
        alert("Pirmiausia pridėkite bent vieną lauką su darbais.");
        return;
    }

    const farmName = userData?.name || "Ūkininko ūkis";
    const farmerPhone = userData?.phone || "";
    const printDate = getTodayDateString();

    let title = "";
    let tableHeaderHtml = "";
    let tableRowsHtml = "";

    if (reportType === 'spray') {
        title = "AUGALŲ APSAUGOS PRODUKTŲ NAUDOJIMO APSKAITOS ŽURNALAS";
        tableHeaderHtml = `
            <tr>
                <th style="border: 1px solid #000; padding: 6px;">Eil. Nr.</th>
                <th style="border: 1px solid #000; padding: 6px;">Lauko pavadinimas / Bloko Nr.</th>
                <th style="border: 1px solid #000; padding: 6px;">Plotas (ha)</th>
                <th style="border: 1px solid #000; padding: 6px;">Pasėlis</th>
                <th style="border: 1px solid #000; padding: 6px;">Apdorojimo data</th>
                <th style="border: 1px solid #000; padding: 6px;">Produkto pavadinimas</th>
                <th style="border: 1px solid #000; padding: 6px;">Norma / Kiekis</th>
                <th style="border: 1px solid #000; padding: 6px;">Pastabos / Oro sąlygos</th>
            </tr>
        `;

        let counter = 1;
        userFieldsList.forEach(f => {
            const sprayOps = (f.operations || []).filter(op => op.type === "Purškimas");
            if (sprayOps.length === 0) {
                tableRowsHtml += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${counter++}</td>
                        <td style="border: 1px solid #000; padding: 6px;">${f.name} ${f.fieldBlockNumber ? `(${f.fieldBlockNumber})` : ''}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${f.areaHa}</td>
                        <td style="border: 1px solid #000; padding: 6px;">${f.crop}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
                        <td style="border: 1px solid #000; padding: 6px;">Nepurkšta</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
                        <td style="border: 1px solid #000; padding: 6px;">-</td>
                    </tr>
                `;
            } else {
                sprayOps.forEach(op => {
                    tableRowsHtml += `
                        <tr>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${counter++}</td>
                            <td style="border: 1px solid #000; padding: 6px;">${f.name} ${f.fieldBlockNumber ? `(${f.fieldBlockNumber})` : ''}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${f.areaHa}</td>
                            <td style="border: 1px solid #000; padding: 6px;">${f.crop}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${op.date || '-'}</td>
                            <td style="border: 1px solid #000; padding: 6px;">${op.product || 'AAP preparatas'}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${op.rate || op.details || '-'}</td>
                            <td style="border: 1px solid #000; padding: 6px;">${op.notes || '-'}</td>
                        </tr>
                    `;
                });
            }
        });
    } else if (reportType === 'fertilizer') {
        title = "TRĄŠŲ NAUDOJIMO APSKAITOS ŽURNALAS";
        tableHeaderHtml = `
            <tr>
                <th style="border: 1px solid #000; padding: 6px;">Eil. Nr.</th>
                <th style="border: 1px solid #000; padding: 6px;">Lauko pavadinimas / Nr.</th>
                <th style="border: 1px solid #000; padding: 6px;">Plotas (ha)</th>
                <th style="border: 1px solid #000; padding: 6px;">Pasėlis</th>
                <th style="border: 1px solid #000; padding: 6px;">Tręšimo data</th>
                <th style="border: 1px solid #000; padding: 6px;">Trąšų pavadinimas</th>
                <th style="border: 1px solid #000; padding: 6px;">Tręšimo norma</th>
                <th style="border: 1px solid #000; padding: 6px;">Išlaidos (€)</th>
            </tr>
        `;

        let counter = 1;
        userFieldsList.forEach(f => {
            const fertOps = (f.operations || []).filter(op => op.type === "Tręšimas" || op.type === "Kalkinimas");
            fertOps.forEach(op => {
                tableRowsHtml += `
                    <tr>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${counter++}</td>
                        <td style="border: 1px solid #000; padding: 6px;">${f.name}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${f.areaHa}</td>
                        <td style="border: 1px solid #000; padding: 6px;">${f.crop}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${op.date || '-'}</td>
                        <td style="border: 1px solid #000; padding: 6px;">${op.product || 'Mineralinės trąšos'}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: center;">${op.rate || '-'}</td>
                        <td style="border: 1px solid #000; padding: 6px; text-align: right;">${op.cost ? parseFloat(op.cost).toFixed(2) + ' €' : '-'}</td>
                    </tr>
                `;
            });
        });
    } else {
        title = "SĖJOMAINOS IR DERLIAUS SUVESTINĖS ATASKAITA";
        tableHeaderHtml = `
            <tr>
                <th style="border: 1px solid #000; padding: 6px;">Eil. Nr.</th>
                <th style="border: 1px solid #000; padding: 6px;">Lauko pavadinimas</th>
                <th style="border: 1px solid #000; padding: 6px;">Plotas (ha)</th>
                <th style="border: 1px solid #000; padding: 6px;">Augintas pasėlis</th>
                <th style="border: 1px solid #000; padding: 6px;">Sėjos data</th>
                <th style="border: 1px solid #000; padding: 6px;">Nukultas derlius (t)</th>
                <th style="border: 1px solid #000; padding: 6px;">Derlingumas (t/ha)</th>
                <th style="border: 1px solid #000; padding: 6px;">Savikaina (€)</th>
            </tr>
        `;

        let counter = 1;
        let grandTotalArea = 0;
        let grandTotalCost = 0;
        let grandTotalYield = 0;

        userFieldsList.forEach(f => {
            const area = parseFloat(f.areaHa) || 0;
            grandTotalArea += area;

            let fieldCost = 0;
            let fieldYield = 0;
            let sejosData = "-";

            (f.operations || []).forEach(op => {
                if (op.cost) fieldCost += parseFloat(op.cost);
                if (op.type === "Sėja" && op.date) sejosData = op.date;
                if (op.type === "Kūlimas" && op.rate) {
                    const parsed = parseFloat(op.rate);
                    if (!isNaN(parsed)) fieldYield += parsed;
                }
            });

            grandTotalCost += fieldCost;
            grandTotalYield += fieldYield;

            tableRowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">${counter++}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${f.name}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">${area.toFixed(2)}</td>
                    <td style="border: 1px solid #000; padding: 6px;">${f.crop}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">${sejosData}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">${fieldYield > 0 ? fieldYield.toFixed(2) + ' t' : '-'}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">${fieldYield > 0 ? (fieldYield / area).toFixed(2) + ' t/ha' : '-'}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: right;">${fieldCost.toFixed(2)} €</td>
                </tr>
            `;
        });

        tableRowsHtml += `
            <tr style="font-weight: bold; background: #eee;">
                <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: right;">IŠ VISO:</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalArea.toFixed(2)} ha</td>
                <td colspan="2" style="border: 1px solid #000; padding: 6px;"></td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalYield.toFixed(2)} t</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grandTotalArea > 0 ? (grandTotalYield / grandTotalArea).toFixed(2) + ' t/ha' : '-'}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${grandTotalCost.toFixed(2)} €</td>
            </tr>
        `;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; font-size: 12px; margin: 20mm; color: #000; }
                h2 { text-align: center; font-size: 16px; margin-bottom: 5px; text-transform: uppercase; }
                .meta-box { margin-bottom: 15px; font-size: 12px; line-height: 1.5; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                th { background-color: #f2f2f2; }
                .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
                @media print {
                    body { margin: 10mm; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #2E7D32; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    🖨️ Spausdinti / Išsaugoti PDF
                </button>
            </div>
            <h2>${title}</h2>
            <div class="meta-box">
                <div><strong>Ūkis / Valdytojas:</strong> ${farmName}</div>
                <div><strong>Telefonas:</strong> ${farmerPhone}</div>
                <div><strong>Ataskaitos data:</strong> ${printDate}</div>
            </div>
            <table>
                <thead>${tableHeaderHtml}</thead>
                <tbody>${tableRowsHtml}</tbody>
            </table>
            <div class="footer-sign">
                <div>Žurnalą užpildė (parašas): _______________________</div>
                <div>Ūkio valdytojas / Agronomas: _______________________</div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

/**
 * 📊 TIKRASIS EXCEL (.XLS) EKSPORTAS - 100% GARANTUOJA LIETUVIŠKAS RAIDĖS IR ATSKIRUS STULPELIUS
 */
export function exportReportToExcel(reportType, userFieldsList, userData) {
    if (!userFieldsList || userFieldsList.length === 0) {
        alert("Nėra duomenų eksportui.");
        return;
    }

    let title = "";
    let headers = [];
    let rowsHtml = "";
    const filename = `${reportType}_zurnalas_${getTodayDateString()}.xls`;

    if (reportType === 'spray') {
        title = "Augalų apsaugos produktų naudojimo apskaitos žurnalas";
        headers = ["Eil. Nr.", "Lauko pavadinimas", "Bloko Nr.", "Plotas (ha)", "Pasėlis", "Apdorojimo data", "Produkto pavadinimas", "Norma / Kiekis", "Pastabos"];
        
        let counter = 1;
        userFieldsList.forEach(f => {
            const sprayOps = (f.operations || []).filter(op => op.type === "Purškimas");
            if (sprayOps.length === 0) {
                rowsHtml += `<tr><td>${counter++}</td><td>${f.name}</td><td>${f.fieldBlockNumber || ''}</td><td>${f.areaHa}</td><td>${f.crop}</td><td>-</td><td>Nepurkšta</td><td>-</td><td>-</td></tr>`;
            } else {
                sprayOps.forEach(op => {
                    rowsHtml += `<tr><td>${counter++}</td><td>${f.name}</td><td>${f.fieldBlockNumber || ''}</td><td>${f.areaHa}</td><td>${f.crop}</td><td>${op.date || ''}</td><td>${op.product || ''}</td><td>${op.rate || ''}</td><td>${op.notes || ''}</td></tr>`;
                });
            }
        });
    } else if (reportType === 'fertilizer') {
        title = "Trąšų naudojimo apskaitos žurnalas";
        headers = ["Eil. Nr.", "Lauko pavadinimas", "Plotas (ha)", "Pasėlis", "Tręšimo data", "Trąšų pavadinimas", "Tręšimo norma", "Išlaidos (EUR)"];

        let counter = 1;
        userFieldsList.forEach(f => {
            const fertOps = (f.operations || []).filter(op => op.type === "Tręšimas" || op.type === "Kalkinimas");
            fertOps.forEach(op => {
                rowsHtml += `<tr><td>${counter++}</td><td>${f.name}</td><td>${f.areaHa}</td><td>${f.crop}</td><td>${op.date || ''}</td><td>${op.product || ''}</td><td>${op.rate || ''}</td><td>${op.cost || 0}</td></tr>`;
            });
        });
    } else {
        title = "Sėjomainos ir derliaus suvestinė";
        headers = ["Eil. Nr.", "Lauko pavadinimas", "Plotas (ha)", "Pasėlis", "Sėjos data", "Nukultas derlius (t)", "Derlingumas (t/ha)", "Savikaina (EUR)"];

        let counter = 1;
        userFieldsList.forEach(f => {
            const area = parseFloat(f.areaHa) || 0;
            let fieldCost = 0;
            let fieldYield = 0;
            let sejosData = "-";

            (f.operations || []).forEach(op => {
                if (op.cost) fieldCost += parseFloat(op.cost);
                if (op.type === "Sėja" && op.date) sejosData = op.date;
                if (op.type === "Kūlimas" && op.rate) {
                    const parsed = parseFloat(op.rate);
                    if (!isNaN(parsed)) fieldYield += parsed;
                }
            });

            const yieldPerHa = area > 0 ? (fieldYield / area).toFixed(2) : 0;
            rowsHtml += `<tr><td>${counter++}</td><td>${f.name}</td><td>${area.toFixed(2)}</td><td>${f.crop}</td><td>${sejosData}</td><td>${fieldYield.toFixed(2)}</td><td>${yieldPerHa}</td><td>${fieldCost.toFixed(2)}</td></tr>`;
        });
    }

    // 🌟 TIKROJI EXCEL XML/HTML STRUKTŪRA SU GRIEŽTU UTF-8
    const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>${reportType}</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                th { background-color: #2E7D32; color: #FFFFFF; font-weight: bold; border: 0.5pt solid #000000; }
                td { border: 0.5pt solid #D0D0D0; }
            </style>
        </head>
        <body>
            <h3>${title}</h3>
            <p>Ūkis: ${userData?.name || 'Ūkininko ūkis'} | Data: ${getTodayDateString()}</p>
            <table border="1">
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}