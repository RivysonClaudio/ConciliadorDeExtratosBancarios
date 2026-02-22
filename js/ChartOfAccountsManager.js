class ChartOfAccountsManager {
    static openModal() {
        document.getElementById('chartOfAccounts-modal').showModal();
        document.getElementById('search-chart-accounts').value = '';
        document.getElementById('new-account-code').value = '';
        document.getElementById('new-account-description').value = '';
        this.render();
    }

    static render(filterText = '') {
        const chartOfAccounts = StorageManager.getChartOfAccounts();
        const tbody = document.getElementById('chart-of-accounts');
        tbody.innerHTML = '';
        
        const filtered = filterText 
            ? chartOfAccounts.filter(acc => 
                acc.code.toLowerCase().includes(filterText.toLowerCase()) || 
                acc.description.toLowerCase().includes(filterText.toLowerCase()))
            : chartOfAccounts;
        
        document.getElementById('chart-accounts-count').textContent = filtered.length;
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-2 text-gray-500 text-center">Nenhuma conta encontrada</td></tr>';
            return;
        }
        
        filtered.forEach(account => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-blue-50 border-b border-gray-200';
            tr.dataset.id = account.id;
            tr.innerHTML = `
                <td class="px-2 py-1 font-mono">${account.code}</td>
                <td class="px-2 py-1">${account.description}</td>
                <td class="px-1 py-1 text-center">
                    <button class="px-2 py-0.5 bg-red-100 hover:bg-red-200 border border-red-300 cursor-pointer text-red-700 text-[10px]" onclick="ChartOfAccountsManager.delete('${account.id}')">✕</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    static filter(text) {
        this.render(text);
    }

    static addNew() {
        const code = document.getElementById('new-account-code').value.trim();
        const description = document.getElementById('new-account-description').value.trim();
        
        if (!code || !description) {
            showNotification('Preencha código e descrição', 'warning');
            return;
        }
        
        const chartOfAccounts = StorageManager.getChartOfAccounts();
        const id = Utils.generateShortUUID();
        chartOfAccounts.push({ id, code, description });
        StorageManager.setChartOfAccounts(chartOfAccounts);
        
        document.getElementById('new-account-code').value = '';
        document.getElementById('new-account-description').value = '';
        document.getElementById('search-chart-accounts').value = '';
        
        this.render();
        
        showNotification('Conta adicionada', 'success');
    }

    static delete(id) {
        let chartOfAccounts = StorageManager.getChartOfAccounts();
        chartOfAccounts = chartOfAccounts.filter(account => account.id !== id);
        StorageManager.setChartOfAccounts(chartOfAccounts);
        this.render(document.getElementById('search-chart-accounts').value);
    }


    static importCSV() {
        const input = document.getElementById('csv-input');
        let chartOfAccounts = StorageManager.getChartOfAccounts();

        let batchSize = 1;
        let index = 0;

        const self = this;
        const processBatch = (data, batchSize) => {
            let end = Math.min(index + batchSize, data.length);

            for (let i = index; i < end; i++) {
                showNotification(`Importando Plano de Contas... ${Math.round((index / data.length) * 100)}%`);
                if (data[i][0] != "" && data[i][1] != "" && 
                    data[i][0].toUpperCase() != "CLASSIFICAÇÃO" && data[i][0].toUpperCase() != "CONTA") {

                    const json = {
                        id: Utils.generateShortUUID(),
                        code: data[i][1].replace('-', ''),
                        description: data[i][2]
                    };

                    chartOfAccounts.push(json);
                }
            }

            index = end;

            if (index < data.length) {
                setTimeout(() => processBatch(data, batchSize), 0);
            } else {
                StorageManager.setChartOfAccounts(chartOfAccounts);
                self.render();
                showNotification('done');
            }
        };

        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = (e) => {
                const text = e.target.result;
                const rows = text.split("\n").map(row => row.split(";"));
                processBatch(rows, batchSize);
            };

            reader.readAsText(file);
        });

        input.click();
    }
}

function open_chartOfAccounts_modal() { ChartOfAccountsManager.openModal(); }
function include_new_account(json) { ChartOfAccountsManager.addNew(); }
function import_chartOfAccountCSV() { ChartOfAccountsManager.importCSV(); }
