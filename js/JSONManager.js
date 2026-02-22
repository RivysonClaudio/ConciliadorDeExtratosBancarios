class JSONManager {
    static export() {
        showNotification('processing');

        const header_info = StorageManager.getHeaderInfo();
        const banks = StorageManager.getBanks();
        const chartOfAccounts = StorageManager.getChartOfAccounts();
        const transactions = StorageManager.getTransactions();
        const associations = StorageManager.getAssociations();
        const mlData = StorageManager.getMLData();
        const ml_last_train = StorageManager.getMLLastTrain();
        const ml_threshold = StorageManager.getMLThreshold();

        const data = {
            header_info,
            banks,
            chartOfAccounts,
            transactions,
            associations,
            mlData,
            ml_last_train,
            ml_threshold
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const fileName = `Conciliacao Bancaria - ${header_info.razao || 'empresa'}.json`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('done');
    }

    static import() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = (e) => {
                showNotification('processing');

                try {
                    const data = JSON.parse(e.target.result);

                    if (data.header_info) {
                        StorageManager.setHeaderInfo(data.header_info);
                        document.getElementById('header-razao').value = data.header_info.razao || "";
                        document.getElementById('header-cnpj').value = data.header_info.cnpj || "";
                    }

                    if (data.banks) {
                        StorageManager.setBanks(data.banks);
                        BankManager.updateBankFilter(data.banks);
                    }

                    if (data.chartOfAccounts || data.chart_of_accounts) {
                        StorageManager.setChartOfAccounts(data.chartOfAccounts || data.chart_of_accounts);
                    }

                    if (data.transactions) {
                        StorageManager.setTransactions(data.transactions);
                    }

                    if (data.associations || data.associateDescriptionToAccount) {
                        StorageManager.setAssociations(data.associations || data.associateDescriptionToAccount);
                    }

                    if (data.mlData || data.machine_learning) {
                        const mlData = data.mlData || data.machine_learning;
                        StorageManager.setMLData(mlData);
                        MachineLearning.fromJSON(mlData);
                    }
                    
                    if (data.ml_last_train) {
                        StorageManager.setMLLastTrain(data.ml_last_train);
                    }

                    if (data.ml_threshold) {
                        StorageManager.setMLThreshold(data.ml_threshold);
                    }

                    TransactionManager.show();
                    TransactionManager.updateStatus();

                    showNotification('done');
                } catch (error) {
                    showNotification('Erro ao importar arquivo', 'error');
                    console.error('Erro ao importar JSON:', error);
                }
            };

            reader.readAsText(file);
        });

        input.click();
    }

    static clearAll() {
        showConfirmDialog(
            'Confirmação',
            'Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.',
            () => {
                StorageManager.clearAll();
                MachineLearning.reset();

                document.getElementById('header-razao').value = "";
                document.getElementById('header-cnpj').value = "";
                document.getElementById('bank-selection').innerHTML = '<option value="0">Todos dos Bancos</option>';
                document.getElementById('transactions-list').innerHTML = "";
                document.getElementById('numberOfTransactions').value = 0;
                document.getElementById('start-balance').value = "0,00";
                document.getElementById('incomes').value = "0,00";
                document.getElementById('outcomes').value = "0,00";
                document.getElementById('end-balance').value = "0,00";

                TransactionManager.updateStatus();

                showNotification('done');
            }
        );
    }
}

// Funções globais para compatibilidade com HTML onclick
function export_json() { JSONManager.export(); }
function import_json() { JSONManager.import(); }
function clear_all() { JSONManager.clearAll(); }
