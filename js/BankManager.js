class BankManager {
    static openModal() {
        const modal = document.getElementById('newbank-modal');
        const banksList = StorageManager.getBanks();
        const bankSelection = modal.querySelector('select');
        const bankfields = modal.querySelectorAll('input');

        bankSelection.innerHTML = '';
        
        if (banksList.length >= 1) {
            bankSelection.value = 0;
            bankSelection.disabled = false;
            
            const defaultOption = document.createElement('option');
            defaultOption.value = "0";
            defaultOption.selected = true;
            defaultOption.textContent = "Cadastrar nova conta";
            bankSelection.appendChild(defaultOption);
            
            banksList.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.id;
                option.textContent = `${bank.name} - cc: ${bank.cc}`;
                bankSelection.appendChild(option);
            });
        } else {
            bankSelection.value = 0;
            bankSelection.disabled = true;
            
            const defaultOption = document.createElement('option');
            defaultOption.value = "0";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.textContent = "Nenhuma Conta Bancária Cadastrada";
            bankSelection.appendChild(defaultOption);
        }

        bankSelection.onchange = () => {
            for (const bank of banksList) {
                if (bank.id == bankSelection.value) {
                    bankfields[0].value = bank.code;
                    bankfields[1].value = bank.name;
                    bankfields[2].value = bank.cc;
                    bankfields[3].value = bank.date;
                    bankfields[4].value = bank.balance;
                    bankfields[5].value = bank.jounal_account;
                    return;
                }
            }
            bankfields[0].value = "";
            bankfields[1].value = "";
            bankfields[2].value = "";
            bankfields[3].value = "";
            bankfields[4].value = "";
            bankfields[5].value = "";
        };

        modal.showModal();
    }

    static save() {
        const bank_code = document.getElementById('newbank-code');
        const bank_name = document.getElementById('newbank-name');
        const cc = document.getElementById('newbank-account');
        const bankStartDate = document.getElementById('newbank-startDate');
        const bankStartBalance = document.getElementById('newbank-startBalance');
        const ledge_account = document.getElementById('newbank-accountCode');

        const banks = StorageManager.getBanks();

        if (bank_code.value == "" || bank_name.value == "" || cc.value == "" || 
            bankStartDate.value == "" || bankStartBalance.value == "" || ledge_account.value == "") {
            return;
        }

        if (document.getElementById('bank-accounts').value == 0) {
            banks.push({
                id: Utils.generateShortUUID(),
                code: bank_code.value,
                name: bank_name.value,
                cc: cc.value,
                date: bankStartDate.value,
                balance: bankStartBalance.value,
                jounal_account: ledge_account.value,
                ofxImported: []
            });
        } else {
            for (const bank of banks) {
                if (bank.id == document.getElementById('bank-accounts').value) {
                    bank.code = bank_code.value;
                    bank.name = bank_name.value;
                    bank.cc = cc.value;
                    bank.date = bankStartDate.value;
                    bank.balance = bankStartBalance.value;
                    bank.jounal_account = ledge_account.value;
                    break;
                }
            }
        }

        StorageManager.setBanks(banks);
        document.getElementById('newbank-modal').close();

        this.updateBankFilter(banks);

        bank_code.value = '';
        bank_name.value = '';
        cc.value = '';
        bankStartDate.value = '';
        bankStartBalance.value = '';
        ledge_account.value = '';

        TransactionManager.updateStatus();
    }

    static updateBankFilter(banks) {
        const bankFilter = document.getElementById('bank-selection');
        
        bankFilter.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = "0";
        defaultOption.textContent = "Todos dos Bancos";
        bankFilter.appendChild(defaultOption);
        
        for (const bank of banks) {
            const option = document.createElement('option');
            option.value = bank.cc;
            option.textContent = `${bank.name} - cc: ${bank.cc}`;
            bankFilter.appendChild(option);
        }
    }

    static getBankInfo(cc) {
        const banks = StorageManager.getBanks();
        for (const bank of banks) {
            if (cc.includes(bank.cc) || bank.cc.includes(cc)) {
                return `${bank.name} - cc: ${bank.cc}`;
            }
        }
        return cc || "";
    }
}

function open_bank_modal() { BankManager.openModal(); }
function save_newbank() { BankManager.save(); }
