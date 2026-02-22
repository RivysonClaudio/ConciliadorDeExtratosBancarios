class CSVExporter {
    static openModal() {
        const modal = document.getElementById('csvExport');
        const bankSelect = document.getElementById('csv-bank');
        const banks = StorageManager.getBanks();
        
        bankSelect.innerHTML = '';
        
        if (banks.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Nenhum banco cadastrado";
            option.disabled = true;
            bankSelect.appendChild(option);
        } else {
            banks.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.cc;
                option.textContent = `${bank.name} - cc: ${bank.cc}`;
                bankSelect.appendChild(option);
            });
        }
        
        modal.showModal();
    }

    static export() {
        const bankCC = document.getElementById('csv-bank').value;
        const month = document.getElementById('csv-month').value;
        const year = document.getElementById('csv-year').value;
        
        if (!bankCC) {
            showNotification('Selecione um banco', 'warning');
            return;
        }

        const period = year + month;
        const transactions = StorageManager.getTransactions();
        const banks = StorageManager.getBanks();
        const header_info = StorageManager.getHeaderInfo();

        const periodTransactions = transactions.filter(t => 
            (t.cc.includes(bankCC) || bankCC.includes(t.cc)) &&
            t.period == period &&
            t.status !== "CANCELADO" &&
            t.status !== "FRAGMENTADO"
        );

        if (periodTransactions.length === 0) {
            showNotification('Nenhuma movimentação encontrada para o período selecionado', 'warning');
            return;
        }

        const pendingTransactions = periodTransactions.filter(t => t.status === "PENDENTE");
        
        if (pendingTransactions.length > 0) {
            showNotification(`Existem ${pendingTransactions.length} transações PENDENTES no período. Confirme todas antes de exportar.`, 'warning');
            return;
        }

        showNotification('processing');

        let filteredTransactions = periodTransactions.filter(t => t.status === "CONFIRMADO");
        filteredTransactions = filteredTransactions.sort((a, b) => Number(a.date.slice(0, 8)) - Number(b.date.slice(0, 8)));

        const bankInfo = banks.find(b => bankCC.includes(b.cc) || b.cc.includes(bankCC));
        const bankAccount = bankInfo ? bankInfo.jounal_account : "";

        let csvContent = "DATA;DEBITO;CREDITO;VALOR;ESTRUTURA HISTORICO;HISTORICO\n";

        filteredTransactions.forEach(t => {
            const date = Utils.formatDateTime(t.date);
            const description = t.description.replace(/;/g, ',');
            
            const classificationCode = t.classification ? t.classification.split(" - ")[0] : "";
            const isDebit = t.amount.toString().startsWith('-');
            
            const debitAccount = isDebit ? classificationCode : bankAccount;
            const creditAccount = isDebit ? bankAccount : classificationCode;
            
            let rawAmount = t.amount.toString().replace('-', '');
            let valor;
            if (rawAmount.includes(',')) {
                valor = rawAmount;
            } else {
                valor = Utils.formatBRL(parseFloat(rawAmount));
            }

            csvContent += `${date};${debitAccount};${creditAccount};${valor};;${description}\n`;
        });

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const bankName = bankInfo ? bankInfo.name : 'banco';
        const fileName = `conciliacao_${header_info.razao || 'empresa'}_${bankName}_${period}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        document.getElementById('csvExport').close();
        showNotification('done');
    }

    static exportDetailed() {
        showNotification('processing');

        const transactions = StorageManager.getTransactions();
        const banks = StorageManager.getBanks();
        const header_info = StorageManager.getHeaderInfo();
        const bankFilter = document.getElementById('bank-selection');
        const initialMonthFilter = document.getElementById('initial-month');
        const finalMonthFilter = document.getElementById('final-month');
        const yearFilter = document.getElementById('year-filter');

        let cc = bankFilter.value == "0" ? "" : bankFilter.value;
        let initialFilter = yearFilter.value + initialMonthFilter.value;
        let finalFilter = yearFilter.value + finalMonthFilter.value;

        let filteredTransactions = transactions.filter(t => 
            (t.cc.includes(cc) || cc.includes(t.cc)) &&
            initialFilter <= t.period && t.period <= finalFilter
        );

        filteredTransactions = filteredTransactions.sort((a, b) => Number(a.date.slice(0, 8)) - Number(b.date.slice(0, 8)));

        if (filteredTransactions.length == 0) {
            showNotification('Nenhuma movimentação encontrada', 'warning');
            return;
        }

        let csvContent = "ID;DATA;CONTA;TIPO;DESCRICAO;VALOR;STATUS;CLASSIFICACAO\n";

        filteredTransactions.forEach(t => {
            const date = Utils.formatDateTime(t.date);
            const description = t.description.replace(/;/g, ',');

            csvContent += `${t.id};${date};${t.cc};${t.type};${description};${t.amount};${t.status};${t.classification}\n`;
        });

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const fileName = `detalhado_${header_info.razao || 'empresa'}_${initialFilter}_${finalFilter}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('done');
    }
}

// Funções globais para compatibilidade com HTML onclick
function export_csv() { CSVExporter.openModal(); }
function export_detailed_csv() { CSVExporter.exportDetailed(); }
function exportToCSV() { CSVExporter.export(); }
