class CSVExporter {
  static escapeCSV(value) {
    const str = String(value ?? "");
    // CSV com separador ';' (Excel pt-BR). Precisa escapar ;, aspas e quebras de linha.
    if (/[;"\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    }
    return str;
  }

  static openModal() {
    const modal = document.getElementById("csvExport");
    const bankSelect = document.getElementById("csv-bank");
    const banks = StorageManager.getBanks();

    bankSelect.innerHTML = "";

    if (banks.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Nenhum banco cadastrado";
      option.disabled = true;
      bankSelect.appendChild(option);
    } else {
      const allOption = document.createElement("option");
      allOption.value = "0";
      allOption.textContent = "Todos os bancos";
      allOption.selected = true;
      bankSelect.appendChild(allOption);

      banks.forEach((bank) => {
        const option = document.createElement("option");
        option.value = bank.cc;
        option.textContent = `${bank.name} - cc: ${bank.cc}`;
        bankSelect.appendChild(option);
      });
    }

    modal.showModal();
  }

  static export() {
    const bankCC = document.getElementById("csv-bank").value;
    const monthStart = document.getElementById("csv-month-start").value;
    const monthEnd = document.getElementById("csv-month-end").value;
    const year = document.getElementById("csv-year").value;

    if (!bankCC) {
      showNotification("Selecione um banco", "warning");
      return;
    }

    if (monthStart > monthEnd) {
      showNotification("Mês inicial deve ser menor ou igual ao mês final", "warning");
      return;
    }

    const initialPeriod = year + monthStart;
    const finalPeriod = year + monthEnd;
    const transactions = StorageManager.getTransactions();
    const banks = StorageManager.getBanks();
    const header_info = StorageManager.getHeaderInfo();

    const allBanksSelected = bankCC === "0";
    const periodTransactions = transactions.filter(
      (t) =>
        (allBanksSelected || t.cc.includes(bankCC) || bankCC.includes(t.cc)) &&
        initialPeriod <= String(t.period) &&
        String(t.period) <= finalPeriod &&
        t.status !== "CANCELADO" &&
        t.status !== "FRAGMENTADO",
    );

    if (periodTransactions.length === 0) {
      showNotification(
        "Nenhuma movimentação encontrada para o intervalo selecionado",
        "warning",
      );
      return;
    }

    const pendingTransactions = periodTransactions.filter(
      (t) => t.status === "PENDENTE",
    );

    if (pendingTransactions.length > 0) {
      showNotification(
        `Existem ${pendingTransactions.length} transações PENDENTES no intervalo selecionado. Confirme todas antes de exportar.`,
        "warning",
      );
      return;
    }

    showNotification("processing");

    let filteredTransactions = periodTransactions.filter(
      (t) => t.status === "CONFIRMADO",
    );
    filteredTransactions = filteredTransactions.sort(
      (a, b) => Number(a.date.slice(0, 8)) - Number(b.date.slice(0, 8)),
    );

    const bankInfo = allBanksSelected
      ? null
      : banks.find((b) => bankCC.includes(b.cc) || b.cc.includes(bankCC));

    let csvContent =
      "DATA;DEBITO;CREDITO;VALOR;ESTRUTURA HISTORICO;HISTORICO\n";

    filteredTransactions.forEach((t) => {
      const date = Utils.formatDateTime(t.date);
      // Bradesco (e outros) podem vir com ';', aspas e quebras de linha no histórico.
      const description = CSVExporter.escapeCSV(t.description);

      const classificationCode = t.classification
        ? t.classification.split(" - ")[0]
        : "";
      const isDebit = t.amount.toString().startsWith("-");

      const transactionBank = banks.find(
        (b) => t.cc && (t.cc.includes(b.cc) || b.cc.includes(t.cc)),
      );
      const bankAccount = transactionBank ? transactionBank.jounal_account : "";

      const debitAccount = isDebit ? classificationCode : bankAccount;
      const creditAccount = isDebit ? bankAccount : classificationCode;

      let rawAmount = t.amount.toString().replace("-", "");
      let valor = Utils.formatBRL(
        parseFloat(rawAmount.replace(",", ".").replace(".", "")) / 100,
      );

      csvContent +=
        [
          CSVExporter.escapeCSV(date),
          CSVExporter.escapeCSV(debitAccount),
          CSVExporter.escapeCSV(creditAccount),
          CSVExporter.escapeCSV(valor),
          "", // ESTRUTURA HISTORICO sempre vazio
          description,
        ].join(";") + "\n";
    });

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const bankName = allBanksSelected ? "todos_bancos" : bankInfo ? bankInfo.name : "banco";
    const fileName = `conciliacao_${header_info.razao || "empresa"}_${bankName}_${initialPeriod}_${finalPeriod}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    document.getElementById("csvExport").close();
    showNotification("done");
  }

  static exportDetailed() {
    showNotification("processing");

    const transactions = StorageManager.getTransactions();
    const banks = StorageManager.getBanks();
    const header_info = StorageManager.getHeaderInfo();
    const bankFilter = document.getElementById("bank-selection");
    const initialMonthFilter = document.getElementById("initial-month");
    const finalMonthFilter = document.getElementById("final-month");
    const yearFilter = document.getElementById("year-filter");

    let cc = bankFilter.value == "0" ? "" : bankFilter.value;
    let initialFilter = yearFilter.value + initialMonthFilter.value;
    let finalFilter = yearFilter.value + finalMonthFilter.value;

    let filteredTransactions = transactions.filter(
      (t) =>
        (t.cc.includes(cc) || cc.includes(t.cc)) &&
        initialFilter <= t.period &&
        t.period <= finalFilter,
    );

    filteredTransactions = filteredTransactions.sort(
      (a, b) => Number(a.date.slice(0, 8)) - Number(b.date.slice(0, 8)),
    );

    if (filteredTransactions.length == 0) {
      showNotification("Nenhuma movimentação encontrada", "warning");
      return;
    }

    let csvContent =
      "ID;DATA;CONTA;TIPO;DESCRICAO;VALOR;STATUS;CLASSIFICACAO\n";

    filteredTransactions.forEach((t) => {
      const date = Utils.formatDateTime(t.date);
      const description = CSVExporter.escapeCSV(t.description);

      csvContent +=
        [
          CSVExporter.escapeCSV(t.id),
          CSVExporter.escapeCSV(date),
          CSVExporter.escapeCSV(t.cc),
          CSVExporter.escapeCSV(t.type),
          description,
          CSVExporter.escapeCSV(t.amount),
          CSVExporter.escapeCSV(t.status),
          CSVExporter.escapeCSV(t.classification),
        ].join(";") + "\n";
    });

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const fileName = `detalhado_${header_info.razao || "empresa"}_${initialFilter}_${finalFilter}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("done");
  }
}

// Funções globais para compatibilidade com HTML onclick
function export_csv() {
  CSVExporter.openModal();
}
function export_detailed_csv() {
  CSVExporter.exportDetailed();
}
function exportToCSV() {
  CSVExporter.export();
}
