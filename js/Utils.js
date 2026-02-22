class Utils {
    static generateShortUUID() {
        return Math.random().toString(36).substr(2, 15).toUpperCase();
    }

    static formatDateTime(dateString) {
        const year = dateString.slice(0, 4);
        const month = dateString.slice(4, 6);
        const day = dateString.slice(6, 8);
        return `${day}/${month}/${year}`;
    }

    static formatCurrency(value) {
        if (value === null || value === undefined || value === '') {
            return '0,00';
        }
        
        const str = value.toString();
        let number;
        
        if (str.includes(',')) {
            number = parseFloat(str.replace(/\./g, '').replace(',', '.'));
        } else {
            number = parseFloat(str);
        }
        
        if (isNaN(number)) {
            return '0,00';
        }
        
        return number.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    static formatBRL(value) {
        return new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    static parseBRL(value) {
        return parseFloat(value.replace(/\./g, "").replace(",", "."));
    }

    static formatOFXAmount(value) {
        // OFX usa formato americano: -1234.56
        const isNegative = value.includes('-');
        const cleanValue = value.replace('-', '').trim();
        const numValue = parseFloat(cleanValue);
        
        if (isNaN(numValue)) return "0,00";
        
        // Formatar para brasileiro: 1.234,56
        const formatted = Math.abs(numValue).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        return isNegative ? '-' + formatted : formatted;
    }

    static mascaraCNPJ(input) {
        let valor = input.value.replace(/\D/g, "");
        if (valor.length > 14) {
            valor = valor.slice(0, 14);
        }
        valor = valor.replace(/^(\d{2})(\d)/, "$1.$2");
        valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        valor = valor.replace(/\.(\d{3})(\d)/, ".$1/$2");
        valor = valor.replace(/(\d{4})(\d)/, "$1-$2");
        input.value = valor;
    }

    static mascaraMoeda(input) {
        let valor = input.value;
        
        // Verificar se tem "-" em qualquer posição
        const isNegative = valor.includes('-');
        
        // Pegar só os dígitos
        const digits = valor.replace(/\D/g, '');
        
        // Se não tem dígitos, limpa o campo
        if (digits === '') {
            input.value = '';
            return;
        }
        
        // Transformar em inteiro e dividir por 100
        let numero = parseInt(digits, 10) / 100;
        
        // Se negativo, multiplica por -1
        if (isNegative) {
            numero = numero * -1;
        }
        
        // Formatar como moeda brasileira
        const formatado = numero.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        // Substituir no input
        input.value = formatado;
        
        // Mover cursor pro final
        const len = input.value.length;
        input.setSelectionRange(len, len);
    }

    static mascaraNumero(input) {
        input.value = input.value.replace(/[^0-9.,-]/g, "");
    }

    static mask(value, maskPattern) {
        const isNegative = value.includes('-');
        let onlynumbers = value.replace(/\D/g, '');

        if (!onlynumbers || isNaN(Number(onlynumbers))) {
            return "";
        }

        onlynumbers = Number.parseInt(onlynumbers).toString();
        let valueLength = onlynumbers.length;
        let maskedValue = "";

        for (let i = maskPattern.length; i > 0; i--) {
            if (maskPattern[i - 1] === "#" && valueLength === 0) {
                break;
            } else if (maskPattern[i - 1] === "#" && valueLength != 0) {
                maskedValue = onlynumbers[--valueLength] + maskedValue;
            } else if (maskPattern[i - 1] === "0" && valueLength != 0) {
                maskedValue = onlynumbers[--valueLength] + maskedValue;
            } else {
                maskedValue = maskPattern[i - 1] + maskedValue;
            }
        }

        if (isNaN(Number.parseInt(maskedValue[0]))) {
            maskedValue = maskedValue.substring(1);
        }

        if (isNegative) {
            maskedValue = "-" + maskedValue;
        }

        return maskedValue;
    }

    static parseAmount(amount) {
        const str = amount.toString();
        if (str.includes(',')) {
            return parseFloat(str.replace('.', '').replace(',', '.'));
        }
        return parseFloat(str);
    }

    static getValueRange(amount) {
        const absValue = Math.abs(this.parseAmount(amount));
        
        if (absValue < 1) return "CENTAVO";
        if (absValue < 100) return "DEZENA";
        if (absValue < 1000) return "CENTENA";
        if (absValue < 10_000) return "MILHAR";
        if (absValue < 100_000) return "DEZENA_MILHAR";
        if (absValue < 1_000_000) return "CENTENA_MILHAR";
        if (absValue < 10_000_000) return "MILHAO";
        return "DEZENA_MILHAO";
    }

    static getDateRange(date) {
        const day = parseInt(date.slice(6, 8));
        if (day < 10) return "INICIO_MES";
        if (day < 20) return "MEIO_MES";
        return "FIM_MES";
    }

    static getTransactionType(amount) {
        const str = amount.toString();
        return str.startsWith("-") ? "PAYMENT" : "RECEITPT";
    }
}

// Funções globais para compatibilidade com HTML onclick
function mascaraCNPJ(input) { Utils.mascaraCNPJ(input); }
function mascaraMoeda(input) { Utils.mascaraMoeda(input); }
function mascaraNumero(input) { Utils.mascaraNumero(input); }
function mask(value, maskPattern) { return Utils.mask(value, maskPattern); }
function generateShortUUID() { return Utils.generateShortUUID(); }
function formatDateTime(dateString) { return Utils.formatDateTime(dateString); }
function formatCurrency(value) { return Utils.formatCurrency(value); }
