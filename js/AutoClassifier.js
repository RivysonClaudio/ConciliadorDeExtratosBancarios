class AutoClassifier {
    static classify() {
        const transactionList = document.getElementById('transactions-list').querySelectorAll('li') || [];
        const selectedTransactions = Array.from(transactionList).filter(t => t.querySelector('input[type="checkbox"]').checked == true);

        if (selectedTransactions.length == 0) {
            showNotification('Selecione pelo menos uma movimentação', 'warning');
            return;
        }

        showNotification('processing');

        const transactions = StorageManager.getTransactions();
        const hashMap = new Map(transactions.map(item => [item.id, item]));

        let batchSize = 5;
        let index = 0;
        let classified = 0;
        let notClassified = 0;

        const processBatch = () => {
            let end = Math.min(index + batchSize, selectedTransactions.length);

            for (let i = index; i < end; i++) {
                const transaction = selectedTransactions[i];
                const transactionData = hashMap.get(transaction.id);

                if (transactionData.status != "PENDENTE") {
                    continue;
                }

                const type = Utils.getTransactionType(transactionData.amount);
                const value_range = Utils.getValueRange(transactionData.amount);
                const date_rage = Utils.getDateRange(transactionData.date);

                const mlThreshold = StorageManager.getMLThreshold();
                const mlQuery = `${type} ${date_rage} ${transactionData.description} ${value_range}`;
                const classification = MachineLearning.classify(mlQuery, mlThreshold);

                if (classification) {
                    transactionData.status = "CONFIRMADO";
                    transactionData.classification = classification;

                    const item = document.getElementById(transaction.id).querySelectorAll('span');
                    item[5].textContent = "CONFIRMADO";
                    item[6].textContent = classification.split(" - ").slice(1).join(" - ");
                    item[6].setAttribute('data-code', classification.split(" - ")[0]);
                    item[0].querySelector('input').checked = false;

                    if (document.getElementById('only-pending').checked) {
                        item[0].closest('li').remove();
                    }

                    classified++;
                } else {
                    notClassified++;
                }
            }

            index = end;

            if (index < selectedTransactions.length) {
                setTimeout(processBatch, 0);
            } else {
                StorageManager.setTransactions([...hashMap.values()]);
                document.getElementById('checkAll-transactions').checked = false;

                TransactionManager.updateFinalBalance();
                TransactionManager.updateStatus();

                showNotification(`Classificadas: ${classified} | Não classificadas: ${notClassified}`, 'success');
            }
        };

        processBatch();
    }
}

class MLTrainer {
    static train() {
        showNotification('processing');

        const transactions = StorageManager.getTransactions();
        const confirmedTransactions = transactions.filter(t => t.status == "CONFIRMADO" && t.classification != "");

        if (confirmedTransactions.length == 0) {
            showNotification('Nenhuma movimentação confirmada para treinar', 'warning');
            return;
        }

        MachineLearning.reset();

        let batchSize = 10;
        let index = 0;

        const processBatch = () => {
            let end = Math.min(index + batchSize, confirmedTransactions.length);

            for (let i = index; i < end; i++) {
                const t = confirmedTransactions[i];
                const type = Utils.getTransactionType(t.amount);
                const value_range = Utils.getValueRange(t.amount);
                const date_rage = Utils.getDateRange(t.date);

                MachineLearning.train(`${type} ${date_rage} ${t.description} ${value_range}`, t.classification);
            }

            index = end;
            showNotification(`Treinando ML... ${Math.round((index / confirmedTransactions.length) * 100)}%`);

            if (index < confirmedTransactions.length) {
                setTimeout(processBatch, 0);
            } else {
                StorageManager.setMLData(MachineLearning.toJSON());
                showNotification(`ML treinado com ${confirmedTransactions.length} movimentações`, 'success');
            }
        };

        processBatch();
    }
}

// Funções globais para compatibilidade com HTML onclick
function auto_classify() { AutoClassifier.classify(); }
function train_ml() { MLTrainer.train(); }
