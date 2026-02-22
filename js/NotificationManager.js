class NotificationManager {
    constructor() {
        this.overlay = null;
        this.msgbox = null;
        this.escHandler = this.handleEsc.bind(this);
    }

    handleEsc(e) {
        if (e.key === 'Escape' && this.msgbox) {
            this.dismiss();
        }
    }
    
    getOpenDialog() {
        const dialogs = document.querySelectorAll('dialog[open]');
        return dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
    }

    show(message, type = 'info') {
        // Remover msgbox anterior
        this.dismiss();
        
        let icon = '';
        let iconClass = '';
        let text = message;
        let title = 'Aviso';
        let showOk = true;
        
        // Comandos especiais
        if (message === 'processing') {
            iconClass = 'sys-msgbox-icon-loading';
            text = 'Processando, aguarde...';
            title = 'Aguarde';
            showOk = false;
        } else if (message === 'done') {
            iconClass = 'sys-msgbox-icon-success';
            icon = '✓';
            text = 'Operação concluída.';
            title = 'Sucesso';
        } else {
            // Tipos de notificação
            switch(type) {
                case 'success':
                    iconClass = 'sys-msgbox-icon-success';
                    icon = '✓';
                    title = 'Sucesso';
                    break;
                case 'warning':
                    iconClass = 'sys-msgbox-icon-warning';
                    icon = '!';
                    title = 'Atenção';
                    break;
                case 'error':
                    iconClass = 'sys-msgbox-icon-error';
                    icon = '✕';
                    title = 'Erro';
                    break;
                case 'info':
                default:
                    iconClass = 'sys-msgbox-icon-info';
                    icon = 'i';
                    title = 'Informação';
                    break;
            }
        }
        
        // Criar container (sem overlay escuro)
        this.overlay = document.createElement('div');
        this.overlay.className = 'sys-msgbox-container';
        
        // Criar msgbox
        this.msgbox = document.createElement('div');
        this.msgbox.className = 'sys-msgbox';
        this.msgbox.innerHTML = `
            <div class="sys-msgbox-title">
                <span>${title}</span>
                ${showOk ? '<button type="button" class="sys-msgbox-close">✕</button>' : ''}
            </div>
            <div class="sys-msgbox-body">
                <div class="sys-msgbox-icon ${iconClass}">${icon}</div>
                <div class="sys-msgbox-text">${text}</div>
            </div>
            ${showOk ? '<div class="sys-msgbox-buttons"><button type="button" class="sys-msgbox-btn sys-msgbox-btn-primary">OK</button></div>' : ''}
        `;
        
        this.overlay.appendChild(this.msgbox);
        
        // Inserir no dialog aberto ou no body
        const openDialog = this.getOpenDialog();
        if (openDialog) {
            openDialog.appendChild(this.overlay);
        } else {
            document.body.appendChild(this.overlay);
        }
        
        // Adicionar eventos aos botões
        if (showOk) {
            const closeBtn = this.msgbox.querySelector('.sys-msgbox-close');
            const okBtn = this.msgbox.querySelector('.sys-msgbox-btn-primary');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.dismiss());
            }
            if (okBtn) {
                okBtn.addEventListener('click', () => this.dismiss());
                // Focar no botão OK
                setTimeout(() => okBtn.focus(), 10);
            }
            
            document.addEventListener('keydown', this.escHandler);
        }
    }

    dismiss() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.msgbox = null;
            document.removeEventListener('keydown', this.escHandler);
        }
    }
}

const notificationManager = new NotificationManager();

// Funções de conveniência
function showNotification(message, type = 'info') { 
    notificationManager.show(message, type); 
}

// Atalhos para tipos específicos
function showSuccess(message) { notificationManager.show(message, 'success'); }
function showWarning(message) { notificationManager.show(message, 'warning'); }
function showError(message) { notificationManager.show(message, 'error'); }
function showInfo(message) { notificationManager.show(message, 'info'); }

// Dialog de confirmação
let confirmDialogOverlay = null;
let confirmDialogEscHandler = null;
let confirmDialogOnConfirm = null;

function getOpenDialog() {
    const dialogs = document.querySelectorAll('dialog[open]');
    return dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
}

function showConfirmDialog(title, message, onConfirm, onCancel) {
    // Remover dialog anterior se existir
    closeConfirmDialog();
    
    confirmDialogOnConfirm = onConfirm;
    
    // Criar container (sem overlay escuro)
    confirmDialogOverlay = document.createElement('div');
    confirmDialogOverlay.className = 'sys-msgbox-container';
    confirmDialogOverlay.id = 'confirm-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.id = 'confirm-dialog';
    dialog.className = 'sys-msgbox';
    dialog.innerHTML = `
        <div class="sys-msgbox-title">
            <span>${title}</span>
            <button type="button" class="sys-msgbox-close">✕</button>
        </div>
        <div class="sys-msgbox-body">
            <div class="sys-msgbox-icon sys-msgbox-icon-warning">!</div>
            <div class="sys-msgbox-text">${message}</div>
        </div>
        <div class="sys-msgbox-buttons">
            <button type="button" class="sys-msgbox-btn" id="confirm-dialog-cancel">Cancelar</button>
            <button type="button" class="sys-msgbox-btn sys-msgbox-btn-primary" id="confirm-dialog-ok">OK</button>
        </div>
    `;
    
    confirmDialogOverlay.appendChild(dialog);
    
    // Inserir no dialog aberto ou no body
    const openDialog = getOpenDialog();
    if (openDialog) {
        openDialog.appendChild(confirmDialogOverlay);
    } else {
        document.body.appendChild(confirmDialogOverlay);
    }
    
    // Adicionar eventos aos botões
    const closeBtn = dialog.querySelector('.sys-msgbox-close');
    const cancelBtn = dialog.querySelector('#confirm-dialog-cancel');
    const okBtn = dialog.querySelector('#confirm-dialog-ok');
    
    closeBtn.addEventListener('click', () => {
        closeConfirmDialog();
        if (onCancel) onCancel();
    });
    
    cancelBtn.addEventListener('click', () => {
        closeConfirmDialog();
        if (onCancel) onCancel();
    });
    
    okBtn.addEventListener('click', () => {
        const callback = confirmDialogOnConfirm;
        closeConfirmDialog();
        if (callback) callback();
    });
    
    // Adicionar listener para ESC
    confirmDialogEscHandler = (e) => {
        if (e.key === 'Escape') {
            closeConfirmDialog();
            if (onCancel) onCancel();
        }
    };
    document.addEventListener('keydown', confirmDialogEscHandler);
    
    // Focar no botão OK
    setTimeout(() => okBtn.focus(), 10);
}

function closeConfirmDialog() {
    if (confirmDialogOverlay) {
        confirmDialogOverlay.remove();
        confirmDialogOverlay = null;
    }
    if (confirmDialogEscHandler) {
        document.removeEventListener('keydown', confirmDialogEscHandler);
        confirmDialogEscHandler = null;
    }
    confirmDialogOnConfirm = null;
}
