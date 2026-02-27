class TransactionManager {
    static currentTimeout = null;
    static isProcessing = false;

    static show() {
        return new Promise((resolve) => {
            if (this.isProcessing) {
                clearTimeout(this.currentTimeout);
                document.getElementById('transactions-list').innerHTML = "";
                this.isProcessing = false;
            }

            document.getElementById('transactions-list').innerHTML = "";

            let transactions = StorageManager.getTransactions();
            const banks = StorageManager.getBanks();
            const bankFilter = document.getElementById('bank-selection');
            const initialMonthFilter = document.getElementById('initial-month');
            const finalMonthFilter = document.getElementById('final-month');
            const yearFilter = document.getElementById('year-filter');
            const incomesFilter = document.getElementById('only-incomes');
            const outcomesFilter = document.getElementById('only-outcomes');
            const onlyPendingFilter = document.getElementById('only-pending');
            const showCanceledFilter = document.getElementById('show-canceled');

            transactions = transactions.sort((a, b) => Number(a.date.slice(0, 8)) - Number(b.date.slice(0, 8)));

            const savedYearFilter = StorageManager.getYearFilter();
            if (savedYearFilter !== yearFilter.value) {
                yearFilter.value = savedYearFilter;
            }

            let cc = bankFilter.value == "0" ? "" : bankFilter.value;
            let initialFilter = yearFilter.value + initialMonthFilter.value;
            let finalFilter = yearFilter.value + finalMonthFilter.value;

            this.isProcessing = true;
            let batchSize = 5;
            let index = 0;
            let totalFiltered = 0;

            const startBalanceEl = document.getElementById('start-balance');
            const incomesEl = document.getElementById('incomes');
            const outcomesEl = document.getElementById('outcomes');
            const loadingBar = document.getElementById('transactionsLoading');

            let startBalanceTotal = 0;
            let incomesTotal = 0;
            let outcomesTotal = 0;

            banks.forEach(bank => {
                if (cc == "" || cc == bank.cc) {
                    startBalanceTotal += Utils.parseBRL(bank.balance);
                }
            });

            const parseAmount = (amount) => {
                const str = amount.toString();
                if (str.includes(',')) {
                    return parseFloat(str.replace('.', '').replace(',', '.'));
                }
                return parseFloat(str);
            };

            const isCredit = (t) => t.type == "CREDIT" || !t.amount.toString().startsWith("-");
            const isDebit = (t) => t.type == "DEBIT" || t.amount.toString().startsWith("-");

            const processBatch = () => {
                let end = Math.min(index + batchSize, transactions.length);
                let batch = transactions.slice(index, end);

                let filteredBatch = batch.filter(t => (t.cc.includes(cc) || cc.includes(t.cc)));
                filteredBatch = filteredBatch.filter(t => t.status != "FRAGMENTADO");

                filteredBatch.forEach(t => {
                    if (t.period < initialFilter && t.status == "CONFIRMADO") {
                        startBalanceTotal += parseAmount(t.amount);
                    }
                });

                filteredBatch = filteredBatch.filter(t =>
                    initialFilter <= t.period && t.period <= finalFilter
                );

                filteredBatch = filteredBatch.filter(t =>
                    (incomesFilter.checked && isCredit(t)) ||
                    (outcomesFilter.checked && isDebit(t))
                );

                if (onlyPendingFilter.checked) {
                    filteredBatch = filteredBatch.filter(t => t.status === "PENDENTE");
                    showCanceledFilter.checked = false;
                }

                if (!showCanceledFilter.checked) {
                    filteredBatch = filteredBatch.filter(t => t.status !== "CANCELADO");
                }

                filteredBatch.forEach(t => {
                    if (showCanceledFilter.checked || t.status !== "CANCELADO") {
                        this.includeTransaction(t);

                        if (t.status == "CONFIRMADO") {
                            const amount = parseAmount(t.amount);
                            if (isCredit(t)) {
                                incomesTotal += amount;
                            } else {
                                outcomesTotal += Math.abs(amount);
                            }
                        }
                    } else {
                        totalFiltered--;
                    }
                });

                totalFiltered += filteredBatch.length;
                loadingBar.style.width = `${(index / transactions.length) * 100}%`;

                index = end;

                if (index < transactions.length) {
                    this.currentTimeout = setTimeout(processBatch, 1);
                } else {
                    startBalanceEl.value = Utils.formatBRL(startBalanceTotal);
                    incomesEl.value = Utils.formatBRL(incomesTotal);
                    outcomesEl.value = Utils.formatBRL(outcomesTotal);
                    
                    // Reset seleção e checkbox geral ao recarregar a tabela
                    const checkAll = document.getElementById('checkAll-transactions');
                    if (checkAll) checkAll.checked = false;
                    const selectedTotalEl = document.getElementById('selected-total');
                    if (selectedTotalEl) selectedTotalEl.value = Utils.formatBRL(0);
                    
                    resolve(document.getElementById('numberOfTransactions').value = totalFiltered);
                    this.updateFinalBalance();
                    setTimeout(() => { document.getElementById('transactionsLoading').style.width = `0%` }, 100);
                    this.isProcessing = false;
                    this.updateStatus();
                }
            };

            processBatch();
        });
    }

    static includeTransaction(t) {
        const ul_transactions = document.getElementById('transactions-list');
        const bankInfo = BankManager.getBankInfo(t.cc);
        
        const templateId = t.status === "CANCELADO" ? 'template-transaction-canceled' : 'template-transaction';
        const template = document.getElementById(templateId);
        const li = template.content.cloneNode(true).querySelector('li');
        
        li.id = t.id;
        
        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.name = `check-${t.id}`;
        checkbox.id = `check-${t.id}`;
        checkbox.addEventListener('change', () => {
            this.updateSelectedTotal();

            // Atualizar estado do checkbox geral
            const master = document.getElementById('checkAll-transactions');
            if (master) {
                const rows = document.getElementById('transactions-list').querySelectorAll('li');
                let allChecked = true;
                let anyVisible = false;

                rows.forEach(row => {
                    if (row.style.display === '') {
                        const cb = row.querySelector('input[type="checkbox"]');
                        if (cb) {
                            anyVisible = true;
                            if (!cb.checked) {
                                allChecked = false;
                            }
                        }
                    }
                });

                master.checked = anyVisible && allChecked;
            }
        });
        
        if (t.status === "CANCELADO") {
            li.querySelector('[data-field="date"] s').textContent = Utils.formatDateTime(t.date);
            li.querySelector('[data-field="bank"] s').textContent = bankInfo;
            li.querySelector('[data-field="description"] s').textContent = t.description;
            li.querySelector('[data-field="value"] s').textContent = Utils.formatCurrency(t.amount);
        } else {
            li.querySelector('[data-field="date"]').textContent = Utils.formatDateTime(t.date);
            li.querySelector('[data-field="bank"]').textContent = bankInfo;
            li.querySelector('[data-field="description"]').textContent = t.description;
            li.querySelector('[data-field="value"]').textContent = Utils.formatCurrency(t.amount);
        }
        
        const statusSpan = li.querySelector('[data-field="status"]');
        statusSpan.textContent = t.status;
        
        const classificationSpan = li.querySelector('[data-field="classification"]');
        classificationSpan.dataset.code = t.classification.split(" - ")[0];
        classificationSpan.textContent = t.classification.split(" - ").slice(1).join(" - ");
        
        // Indicação de fragmento (filho) - borda lateral azul
        if (t.parent) {
            li.classList.add('fragment-row');
        }
        
        // Ctrl+Click marca/desmarca o checkbox
        li.addEventListener('click', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                checkbox.checked = !checkbox.checked;
                this.updateSelectedTotal();
            }
        });
        
        ul_transactions.appendChild(li);
    }

    static editMode = 'single'; // 'single' ou 'multiple'

    static openEditModal(element) {
        this.editMode = 'single';
        const li = element.tagName === 'LI' ? element : element.closest('li');

        document.getElementById('edit-panel-title').textContent = 'EDITAR MOVIMENTAÇÃO';
        document.getElementById('edit-single-content').classList.remove('hidden');
        document.getElementById('edit-multiple-content').classList.add('hidden');

        document.getElementById('edit-transaction-id').textContent = li.id;
        
        const [day, month, year] = li.querySelectorAll('span')[1].textContent.split('/');
        document.getElementById('edit-date').value = `${year}-${month}-${day}`;
        document.getElementById('edit-historico').value = li.querySelectorAll('span')[3].textContent;
        document.getElementById('edit-situacao').value = li.querySelectorAll('span')[5].textContent;
        document.getElementById('edit-valor').value = li.querySelectorAll('span')[4].textContent;

        const ledge = document.getElementById('edit-conta');
        if (document.getElementById('edit-situacao').value == "CONFIRMADO") {
            const ledgeConfirmed = li.querySelectorAll('span')[6].getAttribute('data-code') + " - " + li.querySelectorAll('span')[6].textContent;
            ledge.value = ledgeConfirmed;
            ledge.textContent = ledgeConfirmed;
        } else {
            ledge.value = "";
            ledge.textContent = "Selecione uma conta";
        }

        const amount = li.querySelectorAll('span')[4].textContent;
        const description = li.querySelectorAll('span')[3].textContent;
        const date = li.querySelectorAll('span')[1].textContent;
        
        const transactionType = Utils.getTransactionType(amount);
        const valueRange = Utils.getValueRange(amount);
        const dateRange = Utils.getDateRange(date.split('/').reverse().join(''));
        
        const mlQuery = `${transactionType} ${dateRange} ${description} ${valueRange}`;
        const mlThreshold = StorageManager.getMLThreshold();
        const ml_sugestion = MachineLearning.classify(mlQuery, mlThreshold);
        if (ml_sugestion && document.getElementById('edit-situacao').value == "PENDENTE") {
            ledge.value = ml_sugestion;
            ledge.textContent = ml_sugestion;
            document.querySelector('.ml-hint').classList.remove('hidden');
        } else {
            document.querySelector('.ml-hint').classList.add('hidden');
        }

        // Mostrar botão de desfragmentar se for um fragmento PENDENTE
        const transactions = StorageManager.getTransactions();
        const transaction = transactions.find(t => t.id === li.id);
        const disfragmentBtn = document.getElementById('edit-disfragment-btn');
        
        if (transaction && transaction.parent && transaction.status === 'PENDENTE') {
            disfragmentBtn.classList.remove('hidden');
        } else {
            disfragmentBtn.classList.add('hidden');
        }

        openEditPanel();
    }

    static openMultipleEditModal() {
        this.editMode = 'multiple';
        let transactionList = document.getElementById('transactions-list').querySelectorAll('li') || [];
        transactionList = Array.from(transactionList).filter(t => t.querySelector('input[type="checkbox"]').checked == true);

        document.getElementById('edit-panel-title').textContent = `EDITAR (${transactionList.length}) MOVIMENTAÇÕES`;
        document.getElementById('edit-single-content').classList.add('hidden');
        document.getElementById('edit-multiple-content').classList.remove('hidden');

        document.getElementById('edit-multi-situacao').value = "PENDENTE";
        document.getElementById('edit-multi-conta').textContent = 'Selecione uma conta';
        document.getElementById('edit-multi-conta').value = '';

        openEditPanel();
    }

    static update(id) {
        const situacao = document.getElementById('edit-situacao').value;
        const ledge = document.getElementById('edit-conta');
        const item = document.getElementById(id).querySelectorAll('span');
        
        if (situacao == "CONFIRMADO" && ledge.value == '') return;

        const transactions = StorageManager.getTransactions();
        const hashMap = new Map(transactions.map(item => [item.id, item]));

        hashMap.get(id).description = document.getElementById('edit-historico').value;
        hashMap.get(id).amount = document.getElementById('edit-valor').value.replace('.', '');
        hashMap.get(id).status = situacao;
        
        if (situacao == "PENDENTE" || situacao == "CANCELADO") {
            hashMap.get(id).classification = "";
        } else {
            hashMap.get(id).classification = ledge.value;
        }

        StorageManager.setTransactions([...hashMap.values()]);

        const type = Utils.getTransactionType(hashMap.get(id).amount);
        const value_range = Utils.getValueRange(hashMap.get(id).amount);
        const date_rage = Utils.getDateRange(hashMap.get(id).date);
        const isFragment = hashMap.get(id).parent && hashMap.get(id).parent !== '';

        if (situacao == "CONFIRMADO" && !isFragment) {
            MachineLearning.train(`${type} ${date_rage} ${hashMap.get(id).description} ${value_range}`, hashMap.get(id).classification);
            StorageManager.setMLData(MachineLearning.toJSON());
        }

        if (item[5].textContent == "CONFIRMADO" && !isFragment) {
            MachineLearning.penalize(`${type} ${date_rage} ${hashMap.get(id).description} ${value_range}`, `${item[6].getAttribute('data-code')} - ${item[6].textContent}`);
            StorageManager.setMLData(MachineLearning.toJSON());
        }

        if (situacao != "CANCELADO") {
            if (item[5].textContent == "CANCELADO") {
                item[1].textContent = item[1].querySelector('s').textContent;
                item[2].textContent = item[2].querySelector('s').textContent;
            }
            item[3].textContent = document.getElementById('edit-historico').value;
            item[4].textContent = document.getElementById('edit-valor').value;
            item[5].textContent = situacao;
            
            if (situacao == "PENDENTE" || situacao == "CANCELADO") {
                item[6].textContent = "";
                item[6].setAttribute('data-code', "");
            } else {
                item[6].setAttribute('data-code', ledge.value.split(" - ")[0]);
                item[6].textContent = ledge.value.split(" - ").slice(1).join(" - ");
            }
        }

        if (document.getElementById('only-pending').checked && situacao != "PENDENTE") {
            item[0].closest('li').remove();
        }

        if ((item[6].textContent == "PENDENTE" || item[6].textContent == "CANCELADO") && situacao == "CONFIRMADO") {
            this.updateIncomesAndOutcomes(hashMap.get(id).type, hashMap.get(id).amount, "SUM");
        } else if (item[6].textContent == "CONFIRMADO" && situacao == "PENDENTE") {
            this.updateIncomesAndOutcomes(hashMap.get(id).type, hashMap.get(id).amount, "SUB");
        }

        closeEditPanel();

        showNotification('done');

        this.updateFinalBalance();
        this.updateStatus();

        if (situacao == "CANCELADO") {
            item[0].closest('li').remove();
        }
    }

    static updateMultiple() {
        const situacao = document.getElementById('edit-multi-situacao').value;
        const ledge = document.getElementById('edit-multi-conta');
        
        if (situacao == "CONFIRMADO" && ledge.value == '') return;

        showNotification('processing');

        const transactions = StorageManager.getTransactions();
        let transactionList = document.getElementById('transactions-list').querySelectorAll('li') || [];
        const hashMap = new Map(transactions.map(item => [item.id, item]));

        transactionList = Array.from(transactionList).filter(t => t.querySelector('input[type="checkbox"]').checked == true);

        let batchSize = 5;
        let index = 0;
        let totalTransactions = transactionList.length;

        const processBatch = () => {
            let end = Math.min(index + batchSize, totalTransactions);

            for (let i = index; i < end; i++) {
                let transaction = transactionList[i];
                const item = document.getElementById(transaction.id).querySelectorAll('span');

                const type = Utils.getTransactionType(hashMap.get(transaction.id).amount);
                const value_range = Utils.getValueRange(hashMap.get(transaction.id).amount);
                const date_rage = Utils.getDateRange(hashMap.get(transaction.id).date);
                const isFragment = hashMap.get(transaction.id).parent && hashMap.get(transaction.id).parent !== '';

                if (situacao == "CONFIRMADO" && !isFragment) {
                    MachineLearning.train(`${type} ${date_rage} ${hashMap.get(transaction.id).description} ${value_range}`, ledge.value);
                }

                if ((item[5].textContent == "CONFIRMADO" || situacao != "CONFIRMADO") && !isFragment) {
                    MachineLearning.penalize(`${type} ${date_rage} ${hashMap.get(transaction.id).description} ${value_range}`, `${item[6].getAttribute('data-code')} - ${item[6].textContent}`);
                }

                if (hashMap.has(transaction.id) && situacao != "CANCELADO") {
                    let transactionData = hashMap.get(transaction.id);
                    transactionData.status = situacao;

                    if (item[5].textContent == "CANCELADO") {
                        item[1].textContent = item[1].querySelector('s').textContent;
                        item[2].textContent = item[2].querySelector('s').textContent;
                        item[3].textContent = item[3].querySelector('s').textContent;
                        item[4].textContent = item[4].querySelector('s').textContent;
                    }

                    if (situacao == "PENDENTE") {
                        transactionData.classification = "";
                    } else {
                        transactionData.classification = ledge.value;
                    }

                    if (document.getElementById('only-pending').checked && situacao != "PENDENTE") {
                        item[0].closest('li').remove();
                    }

                    item[0].querySelector('input').checked = false;
                    item[5].textContent = situacao;

                    if (situacao == "PENDENTE" || situacao == "CANCELADO") {
                        item[6].textContent = "";
                        item[6].setAttribute('data-code', "");
                    } else {
                        item[6].textContent = ledge.value.split(" - ").slice(1).join(" - ");
                        item[6].setAttribute('data-code', ledge.value.split(" - ")[0]);
                    }
                }

                if (hashMap.has(transaction.id) && situacao == "CANCELADO") {
                    let transactionData = hashMap.get(transaction.id);
                    transactionData.status = situacao;
                    transactionData.classification = "";
                    item[0].closest('li').remove();
                }
            }

            index = end;

            if (index < totalTransactions) {
                setTimeout(processBatch, 0);
            } else {
                StorageManager.setTransactions([...hashMap.values()]);
                closeEditPanel();
                document.getElementById('checkAll-transactions').checked = false;
                this.updateFinalBalance();
                this.updateStatus();

                showNotification('done');

                StorageManager.setMLData(MachineLearning.toJSON());
            }
        };

        processBatch();
    }

    static updateIncomesAndOutcomes(type, amount, operation) {
        const incomesEl = document.getElementById('incomes');
        const outcomesEl = document.getElementById('outcomes');

        const str = amount.toString();
        let newAmount;
        if (str.includes(',')) {
            newAmount = Math.abs(parseFloat(str.replace('.', '').replace(',', '.')));
        } else {
            newAmount = Math.abs(parseFloat(str));
        }

        const isCredit = type == "CREDIT" || !str.startsWith("-");

        if (isCredit) {
            const currentValue = Utils.parseBRL(incomesEl.value);
            const newValue = operation == "SUM" ? currentValue + newAmount : currentValue - newAmount;
            incomesEl.value = Utils.formatBRL(newValue);
        } else {
            const currentValue = Utils.parseBRL(outcomesEl.value);
            const newValue = operation == "SUM" ? currentValue + newAmount : currentValue - newAmount;
            outcomesEl.value = Utils.formatBRL(newValue);
        }
    }

    static updateFinalBalance() {
        const startBalance = document.getElementById('start-balance');
        const incomes = document.getElementById('incomes');
        const outcomes = document.getElementById('outcomes');
        const endBalance = document.getElementById('end-balance');

        const startBalanceFloat = Utils.parseBRL(startBalance.value);
        const incomesFloat = Utils.parseBRL(incomes.value);
        const outcomesFloat = Utils.parseBRL(outcomes.value);
        endBalance.value = Utils.formatBRL(startBalanceFloat + incomesFloat - outcomesFloat);
    }

    static updateSelectedTotal() {
        const selectedTotalEl = document.getElementById('selected-total');
        if (!selectedTotalEl) return;

        const transactions = StorageManager.getTransactions();
        const map = new Map(transactions.map(t => [t.id, t]));

        let total = 0;
        const selectedLis = document
            .getElementById('transactions-list')
            .querySelectorAll('li');

        selectedLis.forEach(li => {
            const checkbox = li.querySelector('input[type="checkbox"]');
            if (!checkbox || !checkbox.checked) return;
            if (li.style.display !== '') return;

            const t = map.get(li.id);
            if (!t) return;

            const amount = Utils.parseAmount(t.amount);
            total += amount;
        });

        selectedTotalEl.value = Utils.formatBRL(total);
    }

    static updateStatus() {
        const statusList = Array.from(document.querySelectorAll('[data-month-status]'));
        const banks = StorageManager.getBanks();
        const transactions = StorageManager.getTransactions();
        const [day, month, year] = new Date().toLocaleDateString().split('/');
        const filterYear = document.getElementById('year-filter').value;
        let foundOfx = {};

        for (let i = 1; i <= 12; i++) {
            const key = `${filterYear}${i.toString().padStart(2, '0')}`;
            foundOfx[key] = { has: 0, shouldHave: 0 };
        }

        banks.forEach(bank => {
            Object.keys(foundOfx).forEach(key => {
                if (key >= bank.date.split('/').reverse().join('') && key < (year + month)) {
                    foundOfx[key].shouldHave++;
                }
            });

            bank.ofxImported.forEach(file => {
                if (parseInt(`${filterYear}01`) <= file.period && file.period <= parseInt(`${filterYear}12`)) {
                    foundOfx[file.period].has++;
                }
            });
        });

        for (let i = 0; i < statusList.length; i++) {
            const period = filterYear + statusList[i].getAttribute('data-month-status');

            const removeAllStatusClasses = () => {
                statusList[i].classList.remove('redStatus');
                statusList[i].classList.remove('yellowStatus');
                statusList[i].classList.remove('greenStatus');
            };

            if (foundOfx[period].shouldHave == 0) {
                removeAllStatusClasses();
                continue;
            }

            if (foundOfx[period].has == 0) {
                removeAllStatusClasses();
                statusList[i].classList.add('redStatus');
            }

            if (foundOfx[period].has != foundOfx[period].shouldHave && foundOfx[period].has != 0) {
                removeAllStatusClasses();
                statusList[i].classList.add('yellowStatus');
            }

            if (foundOfx[period].has == foundOfx[period].shouldHave) {
                removeAllStatusClasses();
                const hasPending = transactions.some(t => t.status === "PENDENTE" && t.period == period);
                statusList[i].classList.add(hasPending ? 'yellowStatus' : 'greenStatus');
            }
        }
    }

    static dinamicFilter() {
        const searchFilter = document.getElementById('search-transactions');
        const list = document.getElementById('transactions-list');
        const transactions = list.querySelectorAll('li');

        if (searchFilter.value == "=:TREINAR_ML") {
            for (let t of transactions) {
                t.style.display = '';
            }
            MLTrainer.train();
            return;
        }

        if (searchFilter.value.startsWith("=:ML>>>")) {
            let query = searchFilter.value.split("=:ML>>>")[1].trim();
            for (let t of transactions) {
                t.style.display = '';
            }
            const mlThreshold = StorageManager.getMLThreshold();
            showNotification("O ML Classificou como >>> " + MachineLearning.classify(query, mlThreshold), 'info');
            return;
        }

        const searchValue = searchFilter.value.trim();
        const isExclude = searchValue.startsWith('!');
        const searchTerm = isExclude ? searchValue.slice(1) : searchValue;

        if (searchTerm.length < 3) {
            for (let t of transactions) {
                t.style.display = '';
            }
            return;
        }

        const searchTermUpper = searchTerm.toUpperCase();

        for (let i = 0; i < transactions.length; i++) {
            const t = transactions[i];
            const spans = t.querySelectorAll('span');
            const transactionString = `${spans[1].textContent} ${spans[3].textContent} ${spans[4].textContent} ${spans[5].textContent} ${spans[6].textContent}`.toUpperCase();
            
            const matches = transactionString.includes(searchTermUpper);
            
            if (isExclude) {
                t.style.display = matches ? 'none' : '';
            } else {
                t.style.display = matches ? '' : 'none';
            }
        }
    }

    static checkAll() {
        const checkAllTransactions = document.getElementById('checkAll-transactions');
        const transactionList = document.getElementById('transactions-list').querySelectorAll('li') || [];

        transactionList.forEach(transaction => {
            if (transaction.style.display === '') {
                const checkbox = transaction.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = checkAllTransactions.checked;
                }
            }
        });

        this.updateSelectedTotal();
    }
}

function show_transactions() { return TransactionManager.show(); }
function open_transactionEdit_modal(html) { TransactionManager.openEditModal(html); }
function open_multipleEdit_modal() { TransactionManager.openMultipleEditModal(); }
function update_transction(id) { TransactionManager.update(id); }
function update_multipleTransactions() { TransactionManager.updateMultiple(); }
function update_status() { TransactionManager.updateStatus(); }
function dinamicFilter() { TransactionManager.dinamicFilter(); }
function checkAllTrasactions() { TransactionManager.checkAll(); }
function updateFinalBalance() { TransactionManager.updateFinalBalance(); }
