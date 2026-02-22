class StorageManager {
    static KEYS = {
        HEADER_INFO: 'header_info',
        BANKS: 'banks',
        CHART_OF_ACCOUNTS: 'chart_of_accounts',
        TRANSACTIONS: 'transactions',
        ASSOCIATE_DESCRIPTION: 'associateDescriptionToAccount',
        MACHINE_LEARNING: 'machine_learning',
        ML_LAST_TRAIN: 'ml_last_train',
        ML_THRESHOLD: 'ml_threshold',
        YEAR_FILTER: 'yearFilter'
    };

    static get(key, defaultValue = []) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    }

    static set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    static getHeaderInfo() {
        return this.get(this.KEYS.HEADER_INFO, { razao: "", cnpj: "" });
    }

    static setHeaderInfo(data) {
        this.set(this.KEYS.HEADER_INFO, data);
    }

    static getBanks() {
        return this.get(this.KEYS.BANKS, []);
    }

    static setBanks(banks) {
        this.set(this.KEYS.BANKS, banks);
    }

    static getChartOfAccounts() {
        return this.get(this.KEYS.CHART_OF_ACCOUNTS, []);
    }

    static setChartOfAccounts(accounts) {
        this.set(this.KEYS.CHART_OF_ACCOUNTS, accounts);
    }

    static getTransactions() {
        return this.get(this.KEYS.TRANSACTIONS, []);
    }

    static setTransactions(transactions) {
        this.set(this.KEYS.TRANSACTIONS, transactions);
    }

    static getAssociations() {
        return this.get(this.KEYS.ASSOCIATE_DESCRIPTION, []);
    }

    static setAssociations(associations) {
        this.set(this.KEYS.ASSOCIATE_DESCRIPTION, associations);
    }

    static getMLData() {
        return this.get(this.KEYS.MACHINE_LEARNING, {});
    }

    static setMLData(data) {
        this.set(this.KEYS.MACHINE_LEARNING, data);
    }

    static getMLLastTrain() {
        return localStorage.getItem(this.KEYS.ML_LAST_TRAIN) || null;
    }

    static setMLLastTrain(date) {
        localStorage.setItem(this.KEYS.ML_LAST_TRAIN, date);
    }

    static getMLThreshold() {
        return parseFloat(localStorage.getItem(this.KEYS.ML_THRESHOLD)) || 0.4;
    }

    static setMLThreshold(value) {
        localStorage.setItem(this.KEYS.ML_THRESHOLD, value);
    }

    static getYearFilter() {
        return localStorage.getItem(this.KEYS.YEAR_FILTER) || "2025";
    }

    static setYearFilter(year) {
        localStorage.setItem(this.KEYS.YEAR_FILTER, year);
    }

    static clearAll() {
        this.set(this.KEYS.HEADER_INFO, { razao: "", cnpj: "" });
        this.set(this.KEYS.BANKS, []);
        this.set(this.KEYS.CHART_OF_ACCOUNTS, []);
        this.set(this.KEYS.TRANSACTIONS, []);
        this.set(this.KEYS.ASSOCIATE_DESCRIPTION, []);
        this.set(this.KEYS.MACHINE_LEARNING, {});
        localStorage.removeItem(this.KEYS.YEAR_FILTER);
        localStorage.removeItem(this.KEYS.ML_LAST_TRAIN);
        localStorage.removeItem(this.KEYS.ML_THRESHOLD);
    }
}
