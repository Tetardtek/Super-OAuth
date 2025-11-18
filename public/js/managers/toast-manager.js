/**
 * Toast Manager - Système de notifications
 * @version 1.0.0
 */

export class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.initContainer();
    }

    initContainer() {
        // Créer le conteneur de toast s'il n'existe pas
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type, duration);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Animation d'entrée
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);

        // Auto-suppression
        setTimeout(() => {
            this.remove(toast);
        }, duration);

        return toast;
    }

    createToast(message, type, duration) {
        const toast = document.createElement('div');

        const colors = {
            success: { bg: '#10b981', icon: '✅' },
            error: { bg: '#ef4444', icon: '❌' },
            warning: { bg: '#f59e0b', icon: '⚠️' },
            info: { bg: '#3b82f6', icon: 'ℹ️' }
        };

        const config = colors[type] || colors.info;

        toast.style.cssText = `
            background: ${config.bg};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
            pointer-events: auto;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;

        toast.innerHTML = `
            <span style="font-size: 16px;">${config.icon}</span>
            <span style="flex: 1;">${message}</span>
            <span style="font-size: 18px; opacity: 0.7; margin-left: 10px;">×</span>
        `;

        // Clic pour fermer
        toast.addEventListener('click', () => {
            this.remove(toast);
        });

        return toast;
    }

    remove(toast) {
        if (!toast || !toast.parentElement) return;

        // Animation de sortie
        toast.style.transform = 'translateX(400px)';
        toast.style.opacity = '0';

        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Instance globale exportée
export const Toast = new ToastManager();
