class OFXImporter {
    static selectedFile = null;
    static fileContent = null;
    
    static selectFile() {
        const input = document.getElementById('ofx-input');
        input.value = '';
        input.click();
    }
    
    static onFileSelected() {
        const input = document.getElementById('ofx-input');
        const fileNameSpan = document.getElementById('ofx-file-name');
        
        if (input.files && input.files[0]) {
            this.selectedFile = input.files[0];
            fileNameSpan.textContent = this.selectedFile.name;
            fileNameSpan.classList.remove('text-gray-500');
            fileNameSpan.classList.add('text-green-700', 'font-semibold');
        } else {
            this.selectedFile = null;
            this.fileContent = null;
            fileNameSpan.textContent = 'Nenhum arquivo selecionado';
            fileNameSpan.classList.add('text-gray-500');
            fileNameSpan.classList.remove('text-green-700', 'font-semibold');
        }
    }
    
    static import() {
        const bankSelect = document.getElementById('ofx-bank');
        const monthSelect = document.getElementById('ofx-month');
        const yearSelect = document.getElementById('ofx-year');
        
        const selectedBankCC = bankSelect.value;
        const selectedMonth = monthSelect.value;
        const selectedYear = yearSelect.value;
        const selectedPeriod = selectedYear + selectedMonth;
        
        if (!selectedBankCC || selectedBankCC === "0") {
            showNotification('Selecione um banco', 'warning');
            return;
        }
        
        const banks = StorageManager.getBanks();
        const bankFound = banks.find(b => b.cc === selectedBankCC);
        
        if (!bankFound) {
            showNotification('Banco não encontrado', 'error');
            return;
        }
        
        if (bankFound.ofxImported && bankFound.ofxImported.some(ofx => String(ofx.period) === selectedPeriod)) {
            showNotification(`Já existe um extrato importado para ${selectedMonth}/${selectedYear}`, 'warning');
            return;
        }
        
        const file = this.selectedFile;
        
        if (!file) {
            showNotification('Selecione um arquivo OFX', 'warning');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            showNotification('processing');

            // Recarregar ML do storage para garantir que está atualizado
            const mlData = StorageManager.getMLData();
            if (mlData && Object.keys(mlData).length > 0) {
                MachineLearning.fromJSON(mlData);
            }

            const text = e.target.result;
            
            const ofxAccountId = text.match(/<ACCTID>([^<]+)/)?.[1] || "";
            
            if (ofxAccountId && !ofxAccountId.includes(bankFound.cc) && !bankFound.cc.includes(ofxAccountId)) {
                showNotification(`A conta do arquivo OFX (${ofxAccountId}) não corresponde à conta selecionada (${bankFound.cc})`, 'error');
                return;
            }
            
            const transactions = StorageManager.getTransactions();
            const hashMap = new Map(transactions.map(item => [item.id, item]));

            const transactionList = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];
            
            const filteredTransactions = [];
            
            for (const transaction of transactionList) {
                const date = transaction.match(/<DTPOSTED>([^<]+)/)?.[1] || "";
                const transactionPeriod = date.slice(0, 6);
                
                if (transactionPeriod === selectedPeriod) {
                    filteredTransactions.push(transaction);
                }
            }
            
            if (filteredTransactions.length === 0) {
                showConfirmDialog(
                    'Confirmação',
                    `Nenhuma movimentação encontrada para ${selectedMonth}/${selectedYear}. Deseja marcar este período como sem movimentação?`,
                    () => {
                        this.markPeriodAsEmpty(bankFound, banks, selectedPeriod, file.name);
                    }
                );
                return;
            }
            
            if (!bankFound.ofxImported) {
                bankFound.ofxImported = [];
            }
            
            bankFound.ofxImported.push({
                id: Utils.generateShortUUID(),
                name: file.name,
                period: selectedPeriod,
                balance: document.getElementById('ofx-given-balance')?.value || '0,00',
                date: new Date().toISOString().split('T')[0]
            });

            StorageManager.setBanks(banks);

            let batchSize = 5;
            let index = 0;
            let importedCount = 0;

            const processBatch = () => {
                let end = Math.min(index + batchSize, filteredTransactions.length);

                for (let i = index; i < end; i++) {
                    const transaction = filteredTransactions[i];
                    const type = transaction.match(/<TRNTYPE>([^<]+)/)?.[1] || "";
                    const date = transaction.match(/<DTPOSTED>([^<]+)/)?.[1] || "";
                    const amount = transaction.match(/<TRNAMT>([^<]+)/)?.[1] || "";
                    const fitid = transaction.match(/<FITID>([^<]+)/)?.[1] || "";
                    const memo = transaction.match(/<MEMO>([^<]+)/)?.[1] || "";

                    const existingTransaction = [...hashMap.values()].find(t => 
                        t.origin === bankFound.id && 
                        t.date === date && 
                        t.amount === amount && 
                        t.description === memo
                    );
                    
                    if (existingTransaction) {
                        continue;
                    }

                    const transactionType = Utils.getTransactionType(amount);
                    const valueRange = Utils.getValueRange(amount);
                    const dateRange = Utils.getDateRange(date);
                    
                    const mlThreshold = StorageManager.getMLThreshold();
                    const mlQuery = `${transactionType} ${dateRange} ${memo} ${valueRange}`;
                    const mlClassification = MachineLearning.classify(mlQuery, mlThreshold);
                    
                    const transactionId = Utils.generateShortUUID();
                    hashMap.set(transactionId, {
                        id: transactionId,
                        origin: bankFound.id,
                        bankID: bankFound.bankID || "",
                        cc: bankFound.cc,
                        date: date,
                        period: selectedPeriod,
                        type: type,
                        description: memo,
                        amount: amount,
                        status: mlClassification ? "CONFIRMADO" : "PENDENTE",
                        classification: mlClassification || ""
                    });
                    
                    importedCount++;
                }

                index = end;

                if (index < filteredTransactions.length) {
                    setTimeout(processBatch, 0);
                } else {
                    StorageManager.setTransactions([...hashMap.values()]);
                    TransactionManager.show();
                    TransactionManager.updateStatus();
                    updateOFXImportedTable();
                    
                    OFXImporter.clearSelection();
                    
                    showNotification(`${importedCount} movimentações importadas`, 'success');
                }
            };

            processBatch();
        };

        reader.readAsText(file);
    }
    
    static markPeriodAsEmpty(bankFound, banks, period, fileName) {
        if (!bankFound.ofxImported) {
            bankFound.ofxImported = [];
        }
        
        bankFound.ofxImported.push({
            id: Utils.generateShortUUID(),
            name: fileName || `Sem movimentação - ${period}`,
            period: period,
            balance: document.getElementById('ofx-given-balance')?.value || '0,00',
            date: new Date().toISOString().split('T')[0],
            empty: true
        });
        
        StorageManager.setBanks(banks);
        TransactionManager.updateStatus();
        updateOFXImportedTable();
        
        OFXImporter.clearSelection();
        
        showNotification('Período marcado como sem movimentação', 'success');
    }
    
    static clearSelection() {
        this.selectedFile = null;
        this.fileContent = null;
        document.getElementById('ofx-input').value = '';
        const fileNameSpan = document.getElementById('ofx-file-name');
        fileNameSpan.textContent = 'Nenhum arquivo selecionado';
        fileNameSpan.classList.add('text-gray-500');
        fileNameSpan.classList.remove('text-green-700', 'font-semibold');
    }

    static importMultiple() {
        const input = document.getElementById('ofx-multiple-input');

        input.addEventListener('change', async () => {
            const files = input.files;
            if (!files || files.length === 0) return;

            showNotification('processing');

            const transactions = StorageManager.getTransactions();
            const banks = StorageManager.getBanks();
            const hashMap = new Map(transactions.map(item => [item.id, item]));

            let totalFiles = files.length;
            let processedFiles = 0;
            let totalImported = 0;

            for (const file of files) {
                await new Promise((resolve) => {
                    const reader = new FileReader();

                    reader.onload = (e) => {
                        const text = e.target.result;

                        const cc = text.match(/<ACCTID>([^<]+)/)?.[1] || "";
                        const transactionList = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];

                        let bankFound = null;
                        for (const bank of banks) {
                            if (cc.includes(bank.cc) || bank.cc.includes(cc)) {
                                bankFound = bank;
                                break;
                            }
                        }

                        if (bankFound) {
                            const periodsInFile = new Set();
                            
                            transactionList.forEach(transaction => {
                                const type = transaction.match(/<TRNTYPE>([^<]+)/)?.[1] || "";
                                const date = transaction.match(/<DTPOSTED>([^<]+)/)?.[1] || "";
                                const amount = transaction.match(/<TRNAMT>([^<]+)/)?.[1] || "";
                                const fitid = transaction.match(/<FITID>([^<]+)/)?.[1] || "";
                                const memo = transaction.match(/<MEMO>([^<]+)/)?.[1] || "";
                                const period = date.slice(0, 6);
                                
                                periodsInFile.add(period);

                                const existingTransaction = [...hashMap.values()].find(t => 
                                    t.origin === bankFound.id && 
                                    t.date === date && 
                                    t.amount === amount && 
                                    t.description === memo
                                );
                                
                                if (!existingTransaction) {
                                    const transactionType = Utils.getTransactionType(amount);
                                    const valueRange = Utils.getValueRange(amount);
                                    const dateRange = Utils.getDateRange(date);
                                    
                                    const mlThreshold = StorageManager.getMLThreshold();
                                    const mlClassification = MachineLearning.classify(`${transactionType} ${dateRange} ${memo} ${valueRange}`, mlThreshold);
                                    
                                    const transactionId = Utils.generateShortUUID();
                                    hashMap.set(transactionId, {
                                        id: transactionId,
                                        origin: bankFound.id,
                                        bankID: bankFound.bankID || "",
                                        cc: bankFound.cc,
                                        date: date,
                                        period: period,
                                        type: type,
                                        description: memo,
                                        amount: amount,
                                        status: mlClassification ? "CONFIRMADO" : "PENDENTE",
                                        classification: mlClassification || ""
                                    });
                                    
                                    totalImported++;
                                }
                            });
                            
                            if (!bankFound.ofxImported) {
                                bankFound.ofxImported = [];
                            }
                            
                            for (const period of periodsInFile) {
                                if (!bankFound.ofxImported.some(ofx => String(ofx.period) === period)) {
                                    bankFound.ofxImported.push({
                                        id: Utils.generateShortUUID(),
                                        name: file.name,
                                        period: period,
                                        balance: '0,00',
                                        date: new Date().toISOString().split('T')[0]
                                    });
                                }
                            }
                        }

                        processedFiles++;
                        showNotification(`Importando OFX... ${Math.round((processedFiles / totalFiles) * 100)}%`);
                        resolve();
                    };

                    reader.readAsText(file);
                });
            }

            StorageManager.setBanks(banks);
            StorageManager.setTransactions([...hashMap.values()]);
            TransactionManager.show();
            TransactionManager.updateStatus();
            updateOFXImportedTable();

            showNotification(`${totalImported} movimentações importadas de ${totalFiles} arquivos`, 'success');

            input.value = "";
        });

        input.click();
    }
}

// Funções globais para compatibilidade com HTML onclick
function import_ofx() { OFXImporter.import(); }
function import_multiple_ofx() { OFXImporter.importMultiple(); }
