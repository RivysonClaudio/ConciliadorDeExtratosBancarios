class FragmentManager {
    static currentTransactionId = null;

    static openModal() {
        const transactionList = document.getElementById('transactions-list').querySelectorAll('li') || [];
        const selectedTransactions = Array.from(transactionList).filter(t => t.querySelector('input[type="checkbox"]').checked == true);

        if (selectedTransactions.length != 1) {
            showNotification('Selecione apenas uma movimentação para fragmentar', 'warning');
            return;
        }

        const transaction = selectedTransactions[0];
        const transactionData = StorageManager.getTransactions().find(t => t.id == transaction.id);

        if (transactionData.status !== "PENDENTE") {
            showNotification('Só é possível fragmentar movimentações com status PENDENTE', 'warning');
            return;
        }

        this.currentTransactionId = transaction.id;

        const panel = document.getElementById('fragment-modal');
        const date = panel.querySelector('input[name="date"]');
        const description = panel.querySelector('input[name="description"]');
        const amount = panel.querySelector('input[name="amount"]');
        const fragmentsList = document.getElementById('fragment-list');

        const [day, month, year] = transaction.querySelectorAll('span')[1].textContent.split('/');
        date.value = `${day}/${month}/${year}`;
        description.value = transaction.querySelectorAll('span')[3].textContent;
        amount.value = transaction.querySelectorAll('span')[4].textContent;
        fragmentsList.innerHTML = '';
        document.getElementById('total-fragmented').textContent = 'Total Fragmentado: 0,00';

        openFragmentPanel();
    }

    static includeFragment() {
        const fragmentsList = document.getElementById('fragment-list');
        
        const template = document.getElementById('template-fragment-item');
        const li = template.content.cloneNode(true).querySelector('li');
        li.id = Utils.generateShortUUID();
        
        fragmentsList.appendChild(li);
    }

    static updateTotal() {
        const fragmentsList = document.getElementById('fragment-list').querySelectorAll('li');
        let total = 0;
        
        fragmentsList.forEach(fragment => {
            const value = fragment.querySelectorAll('input')[1].value;
            if (value) {
                total += Utils.parseBRL(value);
            }
        });
        
        document.getElementById('total-fragmented').textContent = `Total Fragmentado: ${Utils.formatBRL(total)}`;
    }

    static removeFragment(button) {
        const li = button.closest('li');
        li.remove();
    }

    static save() {
        const fragmentsList = document.getElementById('fragment-list').querySelectorAll('li');
        const transactionId = this.currentTransactionId;

        if (fragmentsList.length < 2) {
            showNotification('Adicione pelo menos 2 fragmentos', 'warning');
            return;
        }

        const transactions = StorageManager.getTransactions();
        const hashMap = new Map(transactions.map(item => [item.id, item]));
        const parentTransaction = hashMap.get(transactionId);

        let totalFragments = 0;
        const fragments = [];

        fragmentsList.forEach(fragment => {
            const description = fragment.querySelectorAll('input')[0].value;
            const value = fragment.querySelectorAll('input')[1].value;

            if (description == "" || value == "") {
                showNotification('Preencha todos os campos', 'warning');
                return;
            }

            const parsedValue = Utils.parseBRL(value);
            totalFragments += parsedValue;

            // Salvar no formato americano simples (sem separador de milhar): -1234.56
            const isDebit = parentTransaction.type === "DEBIT" || parentTransaction.amount.toString().startsWith("-");
            const absValue = Math.abs(parsedValue).toFixed(2);
            const fragmentAmount = isDebit ? `-${absValue}` : absValue;

            fragments.push({
                id: fragment.id,
                parent: transactionId,
                origin: parentTransaction.origin,
                bankID: parentTransaction.bankID,
                cc: parentTransaction.cc,
                date: parentTransaction.date,
                period: parentTransaction.period,
                type: parentTransaction.type,
                description: description,
                amount: fragmentAmount,
                status: "PENDENTE",
                classification: ""
            });
        });

        // Parsear valor original (pode estar em formato OFX ou brasileiro)
        let parentValue;
        if (parentTransaction.amount.includes(',')) {
            parentValue = Utils.parseBRL(parentTransaction.amount);
        } else {
            parentValue = parseFloat(parentTransaction.amount);
        }
        
        if (Math.abs(Math.abs(totalFragments) - Math.abs(parentValue)) > 0.01) {
            showNotification(`A soma dos fragmentos (${Utils.formatBRL(Math.abs(totalFragments))}) deve ser igual ao valor original (${Utils.formatBRL(Math.abs(parentValue))})`, 'error');
            return;
        }

        parentTransaction.status = "FRAGMENTADO";
        parentTransaction.children = fragments.map(f => f.id);

        fragments.forEach(fragment => {
            hashMap.set(fragment.id, fragment);
        });

        StorageManager.setTransactions([...hashMap.values()]);

        closeFragmentPanel();
        TransactionManager.show();

        showNotification('done');
    }

    static disfragment(transactionId) {
        const transactions = StorageManager.getTransactions();
        const hashMap = new Map(transactions.map(item => [item.id, item]));
        const transaction = hashMap.get(transactionId);

        if (!transaction.parent) {
            showNotification('Esta movimentação não é um fragmento', 'warning');
            return;
        }

        if (transaction.status !== "PENDENTE") {
            showNotification('Só é possível desfragmentar movimentações com status PENDENTE', 'warning');
            return;
        }

        const parentTransaction = hashMap.get(transaction.parent);

        if (!parentTransaction) {
            showNotification('Transação pai não encontrada', 'error');
            return;
        }

        // Verificar se todos os fragmentos estão PENDENTES
        const allPending = parentTransaction.children.every(childId => {
            const child = hashMap.get(childId);
            return child && child.status === "PENDENTE";
        });

        if (!allPending) {
            showNotification('Todos os fragmentos devem estar com status PENDENTE para desfragmentar', 'warning');
            return;
        }

        parentTransaction.children.forEach(childId => {
            hashMap.delete(childId);
        });

        parentTransaction.status = "PENDENTE";
        delete parentTransaction.children;

        StorageManager.setTransactions([...hashMap.values()]);

        TransactionManager.show();

        showNotification('done');
    }
}

function open_fragment_modal() { FragmentManager.openModal(); }
function include_fragment() { FragmentManager.includeFragment(); }
function remove_fragment(button) { FragmentManager.removeFragment(button); }
function save_fragment() { FragmentManager.save(); }
