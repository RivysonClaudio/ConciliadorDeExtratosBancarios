const MachineLearning = new NaiveBayes();

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadHeaderInfo();
    loadBanks();
    loadYearFilter();
    loadMLData();
    setupEventListeners();
    
    TransactionManager.show();
    TransactionManager.updateStatus();
}

function loadYearFilter() {
    const savedYear = StorageManager.getYearFilter();
    document.getElementById('year-filter').value = savedYear;
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function openEditPanel() {
    const modal = document.getElementById('edit-modal');
    modal.showModal();
    document.getElementById('chartOfAccounts-dropdown').classList.add('hidden');
}

function closeEditPanel() {
    const modal = document.getElementById('edit-modal');
    modal.close();
    document.getElementById('chartOfAccounts-dropdown').classList.add('hidden');
    document.getElementById('chartOfAccounts-dropdown-multi').classList.add('hidden');
    document.getElementById('edit-disfragment-btn').classList.add('hidden');
}

function disfragmentFromModal() {
    const transactionId = document.getElementById('edit-transaction-id').textContent;
    closeEditPanel();
    FragmentManager.disfragment(transactionId);
}

function confirmEdit() {
    if (TransactionManager.editMode === 'single') {
        const id = document.getElementById('edit-transaction-id').textContent;
        TransactionManager.update(id);
    } else {
        TransactionManager.updateMultiple();
    }
}

function toggleChartOfAccountsDropdown(mode) {
    const isMulti = mode === 'multi' || TransactionManager.editMode === 'multiple';
    const suffix = isMulti ? '-multi' : '';
    
    const situacao = isMulti 
        ? document.getElementById('edit-multi-situacao').value 
        : document.getElementById('edit-situacao').value;
    
    if (situacao !== "CONFIRMADO") return;
    
    const dropdown = document.getElementById('chartOfAccounts-dropdown' + suffix);
    dropdown.classList.toggle('hidden');
    
    if (!dropdown.classList.contains('hidden')) {
        loadChartOfAccountsOptions(suffix);
        document.getElementById('chart-filter' + suffix).focus();
    }
}

function loadChartOfAccountsOptions(suffix = '') {
    const chartOfAccounts = StorageManager.getChartOfAccounts();
    const ul = document.getElementById('chartOfAccounts-options' + suffix);
    const template = document.getElementById('template-chart-option');
    
    ul.innerHTML = '';
    
    chartOfAccounts.forEach(account => {
        const li = template.content.cloneNode(true).querySelector('li');
        li.textContent = account.code + " - " + account.description;
        li.onclick = () => selectChartAccount(account.code + " - " + account.description, suffix);
        ul.appendChild(li);
    });
}

function filterChartOfAccounts(mode) {
    const suffix = mode === 'multi' ? '-multi' : '';
    const filter = document.getElementById('chart-filter' + suffix).value.toUpperCase();
    const chartOfAccounts = StorageManager.getChartOfAccounts();
    const ul = document.getElementById('chartOfAccounts-options' + suffix);
    const template = document.getElementById('template-chart-option');
    
    const filtered = chartOfAccounts.filter(account => 
        (account.code + " - " + account.description).toUpperCase().includes(filter)
    );
    
    ul.innerHTML = '';
    
    filtered.forEach(account => {
        const li = template.content.cloneNode(true).querySelector('li');
        li.textContent = account.code + " - " + account.description;
        li.onclick = () => selectChartAccount(account.code + " - " + account.description, suffix);
        ul.appendChild(li);
    });
}

function selectChartAccount(account, suffix = '') {
    const btn = suffix === '-multi' 
        ? document.getElementById('edit-multi-conta') 
        : document.getElementById('edit-conta');
    
    btn.value = account;
    btn.textContent = account;
    
    document.getElementById('chartOfAccounts-dropdown' + suffix).classList.add('hidden');
    document.getElementById('chart-filter' + suffix).value = '';
}

function openFragmentPanel() {
    const modal = document.getElementById('fragment-modal');
    modal.showModal();
}

function closeFragmentPanel() {
    const modal = document.getElementById('fragment-modal');
    modal.close();
}

function openManualTransactionModal() {
    const modal = document.getElementById('manual-transaction-modal');
    const banks = StorageManager.getBanks();
    const bankSelect = document.getElementById('manual-bank');
    
    // Preencher select de bancos
    bankSelect.innerHTML = '<option value="0">Selecione um banco</option>';
    banks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank.id;
        option.textContent = `${bank.code} - ${bank.name}`;
        bankSelect.appendChild(option);
    });
    
    // Selecionar primeiro banco se existir
    if (banks.length > 0) {
        bankSelect.value = banks[0].id;
    }
    
    // Setar data atual
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('manual-date').value = today;
    
    // Limpar campos
    document.getElementById('manual-description').value = '';
    document.getElementById('manual-amount').value = '';
    document.getElementById('manual-type').value = 'DEBIT';
    
    modal.showModal();
}

function saveManualTransaction() {
    const bankId = document.getElementById('manual-bank').value;
    const date = document.getElementById('manual-date').value;
    const description = document.getElementById('manual-description').value.trim();
    const amountStr = document.getElementById('manual-amount').value;
    const type = document.getElementById('manual-type').value;
    
    // Validações
    if (bankId === '0') {
        showNotification('Selecione um banco', 'warning');
        return;
    }
    
    if (!date) {
        showNotification('Informe a data', 'warning');
        return;
    }
    
    if (!description) {
        showNotification('Informe a descrição', 'warning');
        return;
    }
    
    if (!amountStr) {
        showNotification('Informe o valor', 'warning');
        return;
    }
    
    // Buscar banco
    const banks = StorageManager.getBanks();
    const bank = banks.find(b => b.id === bankId);
    
    if (!bank) {
        showNotification('Banco não encontrado', 'error');
        return;
    }
    
    // Converter valor para formato correto
    let amount = Utils.parseAmount(amountStr);
    
    // Se for débito, garantir que seja negativo
    if (type === 'DEBIT' && amount > 0) {
        amount = -amount;
    }
    // Se for crédito, garantir que seja positivo
    if (type === 'CREDIT' && amount < 0) {
        amount = -amount;
    }
    
    // Formatar data no padrão OFX (YYYYMMDD000000[-3:GMT])
    const dateFormatted = date.replace(/-/g, '') + '000000[-3:GMT]';
    
    // Calcular período (YYYYMM)
    const period = date.replace(/-/g, '').slice(0, 6);
    
    // Criar transação
    const transactionId = Utils.generateShortUUID();
    const transaction = {
        id: transactionId,
        origin: bank.id,
        bankID: bank.code || '',
        cc: bank.cc,
        date: dateFormatted,
        period: period,
        type: type,
        description: description.toUpperCase(),
        amount: amount.toFixed(2),
        status: 'PENDENTE',
        classification: ''
    };
    
    // Salvar
    const transactions = StorageManager.getTransactions();
    transactions.push(transaction);
    StorageManager.setTransactions(transactions);
    
    // Fechar modal e atualizar lista
    document.getElementById('manual-transaction-modal').close();
    TransactionManager.show();
    TransactionManager.updateStatus();
    
    showNotification('Transação adicionada com sucesso', 'success');
}

function openImportOFXModal() {
    const modal = document.getElementById('importofx-modal');
    const banks = StorageManager.getBanks();
    const bankSelect = document.getElementById('ofx-bank');
    const tbody = document.querySelector('#importofx-modal table tbody');
    const monthSelect = document.getElementById('ofx-month');
    const yearSelect = document.getElementById('ofx-year');
    const tableYearSelect = document.getElementById('ofx-table-year');
    const balanceInput = document.getElementById('ofx-given-balance');
    
    bankSelect.innerHTML = '<option value="0">Selecione um banco</option>';
    banks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank.cc;
        option.textContent = `${bank.code} - ${bank.name}`;
        bankSelect.appendChild(option);
    });
    
    // Selecionar o primeiro banco automaticamente
    if (banks.length > 0) {
        bankSelect.value = banks[0].cc;
    }
    
    // Setar período atual (mês e ano)
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());
    
    if (monthSelect) {
        monthSelect.value = currentMonth;
    }
    if (yearSelect) {
        yearSelect.value = currentYear;
    }
    if (tableYearSelect) {
        tableYearSelect.value = currentYear;
    }
    
    // Setar saldo final como 0
    if (balanceInput) {
        balanceInput.value = '0,00';
    }
    
    // Atualizar tabela quando selecionar banco
    bankSelect.onchange = () => updateOFXImportedTable();
    
    // Atualizar tabela inicial com o primeiro banco
    updateOFXImportedTable();
    
    modal.showModal();
}

function updateOFXImportedTable() {
    const banks = StorageManager.getBanks();
    const bankSelect = document.getElementById('ofx-bank');
    const tableYearSelect = document.getElementById('ofx-table-year');
    const tbody = document.querySelector('#importofx-modal table tbody');
    const selectedYear = tableYearSelect?.value || String(new Date().getFullYear());
    
    tbody.innerHTML = '';
    
    if (bankSelect.value === '0') return;
    
    const selectedBank = banks.find(b => b.cc === bankSelect.value);
    if (!selectedBank || !selectedBank.ofxImported || selectedBank.ofxImported.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-2 text-gray-500 text-center">Nenhum arquivo importado</td></tr>';
        return;
    }
    
    const filteredOfx = selectedBank.ofxImported
        .filter(ofx => String(ofx.period).slice(0, 4) === selectedYear)
        .sort((a, b) => Number(b.period) - Number(a.period));
    
    if (filteredOfx.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-2 text-gray-500 text-center">Nenhum arquivo importado em ${selectedYear}</td></tr>`;
        return;
    }
    
    filteredOfx.forEach(ofx => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-50 border-b border-gray-200';
        
        const period = String(ofx.period);
        const month = period.slice(4, 6);
        const year = period.slice(0, 4);
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const periodFormatted = `${monthNames[parseInt(month) - 1]}/${year}`;
        
        tr.innerHTML = `
            <td class="border border-gray-300 px-2 py-1">${periodFormatted}</td>
            <td class="border border-gray-300 px-2 py-1">${ofx.date || '-'}</td>
            <td class="border border-gray-300 px-2 py-1 truncate max-w-[200px]" title="${ofx.name}">${ofx.name}</td>
            <td class="border border-gray-300 px-2 py-1 text-right font-mono">${ofx.balance || '0,00'}</td>
            <td class="border border-gray-300 px-1 py-1 text-center">
                <button class="px-2 py-0.5 bg-red-100 hover:bg-red-200 border border-red-300 cursor-pointer text-red-700 text-[10px]" onclick="removeImportedOFX('${selectedBank.id}', '${ofx.id}')">✕</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function removeImportedOFX(bankId, ofxId) {
    const banks = StorageManager.getBanks();
    const bank = banks.find(b => b.id === bankId);
    
    if (!bank || !bank.ofxImported) return;
    
    const ofxRecord = bank.ofxImported.find(ofx => ofx.id === ofxId);
    if (!ofxRecord) return;
    
    const period = String(ofxRecord.period);
    const transactions = StorageManager.getTransactions();
    
    // Buscar transações pelo origin (ID do banco)
    const documentTransactions = transactions.filter(t => t.origin === bankId && String(t.period) === period);
    
    // Verificar se existem transações CONFIRMADAS (só essas bloqueiam a exclusão)
    const confirmedTransactions = documentTransactions.filter(t => t.status === 'CONFIRMADO');
    
    if (confirmedTransactions.length > 0) {
        showNotification(`Não é possível remover: existem ${confirmedTransactions.length} transação(ões) confirmada(s) neste período`, 'warning');
        return;
    }
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const month = monthNames[parseInt(period.slice(4, 6)) - 1];
    const year = period.slice(0, 4);
    
    // Usar modal de confirmação customizado
    showConfirmDialog(
        `Remover importação de ${month}/${year}?`,
        `Isso irá excluir ${documentTransactions.length} transação(ões) deste período.`,
        () => {
            // Remover transações pelo origin
            const updatedTransactions = transactions.filter(t => !(t.origin === bankId && String(t.period) === period));
            StorageManager.setTransactions(updatedTransactions);
            
            // Remover registro de importação
            bank.ofxImported = bank.ofxImported.filter(ofx => ofx.id !== ofxId);
            StorageManager.setBanks(banks);
            
            // Atualizar interface
            updateOFXImportedTable();
            TransactionManager.show();
            TransactionManager.updateStatus();
            
            showNotification('Importação removida com sucesso', 'success');
        }
    );
}

function importWithoutOFX() {
    const bankSelect = document.getElementById('ofx-bank');
    const monthSelect = document.getElementById('ofx-month');
    const yearSelect = document.getElementById('ofx-year');
    const balanceInput = document.getElementById('ofx-given-balance');
    
    if (bankSelect.value === '0') {
        showNotification('Selecione um banco', 'warning');
        return;
    }
    
    const period = yearSelect.value + monthSelect.value;
    const banks = StorageManager.getBanks();
    const bank = banks.find(b => b.cc === bankSelect.value);
    
    if (!bank) {
        showNotification('Banco não encontrado', 'error');
        return;
    }
    
    if (!bank.ofxImported) {
        bank.ofxImported = [];
    }
    
    if (bank.ofxImported.some(ofx => String(ofx.period) === period)) {
        showNotification('Já existe importação para este período', 'warning');
        return;
    }
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = monthNames[parseInt(monthSelect.value) - 1];
    
    showConfirmDialog(
        'Confirmação',
        `Importar ${monthName}/${yearSelect.value} sem movimentação? Isso indica que o banco não teve movimentação neste período.`,
        () => {
            bank.ofxImported.push({
                id: Utils.generateShortUUID(),
                name: '[Sem Movimentação]',
                period: period,
                balance: balanceInput.value || '0,00',
                date: new Date().toISOString().split('T')[0],
                empty: true
            });
            
            StorageManager.setBanks(banks);
            TransactionManager.updateStatus();
            updateOFXImportedTable();
            
            showNotification('Período marcado como sem movimentação', 'success');
        }
    );
}

function openAutomaticClassificationModal() {
    const modal = document.getElementById('automatic-classification');
    const chartOfAccounts = StorageManager.getChartOfAccounts();
    const classifyAsSelect = document.getElementById('classifyAs');
    
    classifyAsSelect.innerHTML = '<option value="">Selecione uma conta</option>';
    chartOfAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.code + " - " + account.description;
        option.textContent = account.code + " - " + account.description;
        classifyAsSelect.appendChild(option);
    });
    
    loadSavedClassifications();
    
    modal.showModal();
}

function loadSavedClassifications() {
    const list = document.getElementById('listOfClassificationSaved');
    const savedClassifications = StorageManager.getAssociations() || [];
    
    list.innerHTML = '';
    
    if (savedClassifications.length === 0) {
        list.innerHTML = '<tr><td colspan="3" class="p-2 text-gray-500 text-center">Nenhuma regra cadastrada</td></tr>';
        return;
    }
    
    savedClassifications.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-50 border-b border-gray-200';
        const desc = item.description || item.find;
        const acc = item.account || item.classify;
        tr.innerHTML = `
            <td class="px-2 py-1 font-semibold">${desc}</td>
            <td class="px-2 py-1">${acc}</td>
            <td class="px-1 py-1 text-center">
                <button class="px-2 py-0.5 bg-red-100 hover:bg-red-200 border border-red-300 cursor-pointer text-red-700 text-[10px]" onclick="removeAutoClassification(${index})">✕</button>
            </td>
        `;
        list.appendChild(tr);
    });
}

function associate_description() {
    const description = document.getElementById('whenFindThis').value.trim();
    const account = document.getElementById('classifyAs').value;
    
    if (!description || !account) {
        showNotification('Preencha todos os campos', 'warning');
        return;
    }
    
    const savedClassifications = StorageManager.getAssociations() || [];
    const id = Math.random().toString(36).substring(2, 12).toUpperCase();
    savedClassifications.push({ id, description, account });
    StorageManager.setAssociations(savedClassifications);
    
    document.getElementById('whenFindThis').value = '';
    document.getElementById('classifyAs').value = '';
    
    loadSavedClassifications();
    
    showNotification('Vinculação salva', 'success');
}

function removeAutoClassification(index) {
    const savedClassifications = StorageManager.getAssociations() || [];
    savedClassifications.splice(index, 1);
    StorageManager.setAssociations(savedClassifications);
    loadSavedClassifications();
}

function execute_automatic_association(mode) {
    const month = document.getElementById('execution-month').value;
    const year = document.getElementById('year-filter').value;
    const period = year + month;
    
    const savedClassifications = StorageManager.getAssociations() || [];
    
    if (savedClassifications.length === 0) {
        showNotification('Nenhuma vinculação cadastrada', 'warning');
        return;
    }
    
    showNotification('processing');
    
    const transactions = StorageManager.getTransactions();
    let classified = 0;
    
    transactions.forEach(t => {
        if (t.status !== "PENDENTE") return;
        if (t.period !== period) return;
        
        for (const rule of savedClassifications) {
            const ruleDesc = rule.description || rule.find;
            const ruleAcc = rule.account || rule.classify;
            if (t.description.toUpperCase().includes(ruleDesc.toUpperCase())) {
                t.status = "CONFIRMADO";
                t.classification = ruleAcc;
                classified++;
                break;
            }
        }
    });
    
    StorageManager.setTransactions(transactions);
    TransactionManager.show();
    
    showNotification(`${classified} movimentações classificadas`, 'success');
}

function loadHeaderInfo() {
    const header_info = StorageManager.getHeaderInfo();
    document.getElementById('header-razao').value = header_info.razao || "";
    document.getElementById('header-cnpj').value = header_info.cnpj || "";
}

function loadBanks() {
    const banks = StorageManager.getBanks();
    BankManager.updateBankFilter(banks);
}

function loadMLData() {
    const mlData = StorageManager.getMLData();
    if (mlData && Object.keys(mlData).length > 0) {
        MachineLearning.fromJSON(mlData);
    }
}

function setupEventListeners() {
    document.getElementById('header-razao').addEventListener('change', saveHeaderInfo);
    document.getElementById('header-cnpj').addEventListener('change', saveHeaderInfo);
    
    document.getElementById('bank-selection').addEventListener('change', () => TransactionManager.show());
    document.getElementById('initial-month').addEventListener('change', () => TransactionManager.show());
    document.getElementById('final-month').addEventListener('change', () => TransactionManager.show());
    document.getElementById('year-filter').addEventListener('change', () => {
        StorageManager.setYearFilter(document.getElementById('year-filter').value);
        TransactionManager.show();
        TransactionManager.updateStatus();
    });
    
    document.getElementById('only-incomes').addEventListener('change', () => TransactionManager.show());
    document.getElementById('only-outcomes').addEventListener('change', () => TransactionManager.show());
    document.getElementById('only-pending').addEventListener('change', () => TransactionManager.show());
    document.getElementById('show-canceled').addEventListener('change', () => TransactionManager.show());
    
    document.getElementById('search-transactions').addEventListener('input', () => TransactionManager.dinamicFilter());
    document.getElementById('checkAll-transactions').addEventListener('change', () => TransactionManager.checkAll());
    
    setupModalCloseListeners();
}

function setupModalCloseListeners() {
    const modals = document.querySelectorAll('dialog');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.close();
            }
        });
    });
}

function saveHeaderInfo() {
    const header_info = {
        razao: document.getElementById('header-razao').value,
        cnpj: document.getElementById('header-cnpj').value
    };
    StorageManager.setHeaderInfo(header_info);
}

function closeModal(modalId) {
    document.getElementById(modalId).close();
}

// ==================== PAINEL ML ====================

function openMLPanel() {
    const modal = document.getElementById('ml-panel');
    updateMLPanelStats();
    updateMLCategoriesList();
    loadMLThresholdSetting();
    modal.showModal();
}

function updateMLPanelStats() {
    const categories = MachineLearning.categories.size;
    const documents = MachineLearning.totalDocuments;
    const vocabulary = MachineLearning.vocabulary.size;
    const threshold = StorageManager.getMLThreshold();
    const lastTrain = StorageManager.getMLLastTrain();
    const stats = MachineLearning.getStats();

    document.getElementById('ml-stat-categories').textContent = categories;
    document.getElementById('ml-stat-documents').textContent = documents;
    document.getElementById('ml-stat-vocabulary').textContent = vocabulary;
    document.getElementById('ml-stat-blacklist').textContent = stats.blacklistCount || 0;
    document.getElementById('ml-stat-threshold').textContent = Math.round(threshold * 100) + '%';

    if (lastTrain) {
        const date = new Date(lastTrain);
        document.getElementById('ml-last-train').textContent = date.toLocaleString('pt-BR');
    } else {
        document.getElementById('ml-last-train').textContent = 'Nunca';
    }

    updateOverfittingIndicator(categories, documents, vocabulary);
}

function updateOverfittingIndicator(categories, documents, vocabulary) {
    const indicator = document.getElementById('ml-overfitting-indicator');
    const status = document.getElementById('ml-overfitting-status');

    if (categories === 0 || documents === 0) {
        indicator.className = 'flex items-center gap-1 px-2 py-0.5 border rounded border-gray-300 bg-gray-50';
        status.textContent = 'Sem dados';
        status.className = 'font-semibold text-[10px] text-gray-500';
        return;
    }

    const avgDocsPerCategory = documents / categories;
    const vocabRatio = vocabulary / documents;
    
    let categoriesWithFewDocs = 0;
    for (const [, data] of MachineLearning.categories.entries()) {
        if (data.docCount < 3) categoriesWithFewDocs++;
    }
    const weakCategoriesRatio = categoriesWithFewDocs / categories;

    let score = 0;
    let issues = [];

    if (avgDocsPerCategory >= 5) {
        score += 40;
    } else if (avgDocsPerCategory >= 3) {
        score += 25;
        issues.push('Poucas amostras/categoria');
    } else {
        score += 10;
        issues.push('Muito poucas amostras');
    }

    if (weakCategoriesRatio <= 0.2) {
        score += 30;
    } else if (weakCategoriesRatio <= 0.4) {
        score += 20;
        issues.push('Categorias fracas');
    } else {
        score += 5;
        issues.push('Muitas categorias fracas');
    }

    if (vocabRatio <= 5) {
        score += 30;
    } else if (vocabRatio <= 10) {
        score += 20;
    } else {
        score += 5;
        issues.push('Vocabulário disperso');
    }

    if (score >= 80) {
        indicator.className = 'flex items-center gap-1 px-2 py-0.5 border rounded border-green-400 bg-green-50';
        status.textContent = 'Bom';
        status.className = 'font-semibold text-[10px] text-green-700';
    } else if (score >= 50) {
        indicator.className = 'flex items-center gap-1 px-2 py-0.5 border rounded border-yellow-400 bg-yellow-50';
        status.textContent = 'Atenção';
        status.className = 'font-semibold text-[10px] text-yellow-700';
        indicator.title = issues.join(', ');
    } else {
        indicator.className = 'flex items-center gap-1 px-2 py-0.5 border rounded border-red-400 bg-red-50';
        status.textContent = 'Risco Overfitting';
        status.className = 'font-semibold text-[10px] text-red-700';
        indicator.title = issues.join(', ');
    }
}

function updateMLCategoriesList() {
    const tbody = document.getElementById('ml-categories-list');
    tbody.innerHTML = '';

    if (MachineLearning.categories.size === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-2 py-3 text-center text-gray-500">Nenhuma categoria treinada</td></tr>';
        return;
    }

    const sortedCategories = [...MachineLearning.categories.entries()]
        .sort((a, b) => b[1].docCount - a[1].docCount);

    for (const [category, data] of sortedCategories) {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-200 hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-2 py-1 truncate max-w-[350px]" title="${category}">${category}</td>
            <td class="px-2 py-1 text-center">${data.docCount}</td>
            <td class="px-2 py-1 text-center">${data.totalWords}</td>
        `;
        tbody.appendChild(tr);
    }
}

function loadMLThresholdSetting() {
    const threshold = StorageManager.getMLThreshold();
    const slider = document.getElementById('ml-threshold-slider');
    const valueDisplay = document.getElementById('ml-threshold-value');
    
    slider.value = Math.round(threshold * 100);
    valueDisplay.textContent = Math.round(threshold * 100) + '%';
}

function updateMLThreshold(value) {
    const threshold = value / 100;
    document.getElementById('ml-threshold-value').textContent = value + '%';
    document.getElementById('ml-stat-threshold').textContent = value + '%';
    StorageManager.setMLThreshold(threshold);
}

function testMLClassification() {
    const input = document.getElementById('ml-test-input').value.trim();
    const resultDiv = document.getElementById('ml-test-result');
    const resultText = document.getElementById('ml-test-result-text');

    if (!input) {
        showNotification('Digite uma descrição para testar', 'warning');
        return;
    }

    const threshold = StorageManager.getMLThreshold();
    const result = MachineLearning.classify(input, threshold);

    resultDiv.classList.remove('hidden');
    
    if (result) {
        resultText.textContent = result;
        resultText.className = 'font-semibold text-green-600';
    } else {
        resultText.textContent = 'Nenhuma classificação encontrada (confiança abaixo do threshold)';
        resultText.className = 'font-semibold text-red-600';
    }
}

function trainMLFromPanel() {
    showNotification('processing');

    const transactions = StorageManager.getTransactions();
    const confirmedTransactions = transactions.filter(t => t.status === "CONFIRMADO" && t.classification);

    if (confirmedTransactions.length === 0) {
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

        if (index < confirmedTransactions.length) {
            setTimeout(processBatch, 0);
        } else {
            StorageManager.setMLData(MachineLearning.toJSON());
            StorageManager.setMLLastTrain(new Date().toISOString());
            
            updateMLPanelStats();
            updateMLCategoriesList();
            
            showNotification(`ML treinado com ${confirmedTransactions.length} movimentações`, 'success');
        }
    };

    processBatch();
}

function resetMLFromPanel() {
    showConfirmDialog('Confirmação', 'Tem certeza que deseja resetar o ML? Todos os dados de treinamento serão perdidos.', () => {
        MachineLearning.reset();
        StorageManager.setMLData({});
        StorageManager.setMLLastTrain(null);
        
        updateMLPanelStats();
        updateMLCategoriesList();
        
        document.getElementById('ml-test-result').classList.add('hidden');
        
        showNotification('ML resetado com sucesso', 'success');
    });
}

function optimizeML() {
    if (MachineLearning.categories.size === 0) {
        showNotification('Nenhum dado para otimizar. Treine o ML primeiro.', 'warning');
        return;
    }

    const statsBefore = MachineLearning.getStats();
    const result = MachineLearning.optimize(5, 2);
    const statsAfter = MachineLearning.getStats();

    StorageManager.setMLData(MachineLearning.toJSON());

    if (statsAfter.suggestedThreshold !== StorageManager.getMLThreshold()) {
        StorageManager.setMLThreshold(statsAfter.suggestedThreshold);
        document.getElementById('ml-threshold-slider').value = Math.round(statsAfter.suggestedThreshold * 100);
        document.getElementById('ml-threshold-value').textContent = Math.round(statsAfter.suggestedThreshold * 100) + '%';
    }

    updateMLPanelStats();
    updateMLCategoriesList();

    let message = 'Otimização concluída: ';
    const changes = [];
    
    if (result.removedCategories > 0) {
        changes.push(`${result.removedCategories} categorias fracas removidas`);
    }
    if (result.removedWords > 0) {
        changes.push(`${result.removedWords} palavras removidas`);
    }
    if (result.balancedCategories > 0) {
        changes.push(`${result.balancedCategories} categorias balanceadas`);
    }
    if (changes.length === 0) {
        changes.push('modelo já otimizado');
    }
    
    message += changes.join(', ');
    
    if (statsAfter.suggestedThreshold !== statsBefore.suggestedThreshold) {
        message += `. Threshold: ${Math.round(statsAfter.suggestedThreshold * 100)}%`;
    }

    showNotification(message, 'success');
}
