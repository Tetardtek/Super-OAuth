// ToastManager pour la documentation
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.init();
    }

    init() {
        // Créer le conteneur des toasts
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.id = 'docsToastContainer';
        
        // Styles inline pour s'assurer que les toasts s'affichent correctement
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            pointer-events: none;
        `;
        
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 5000) {
        const id = Date.now() + Math.random();
        const toast = this.createToast(message, type, id);
        
        this.toasts.set(id, toast);
        this.container.appendChild(toast);
        
        // Animation d'entrée
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });
        
        // Auto-suppression
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
        
        return id;
    }

    createToast(message, type, id) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            cursor: pointer;
            pointer-events: auto;
            font-family: 'Segoe UI', sans-serif;
            font-size: 14px;
            line-height: 1.4;
            max-width: 100%;
            word-wrap: break-word;
            position: relative;
            overflow: hidden;
        `;

        const icon = this.getIcon(type);
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${icon}</span>
                <span style="flex: 1;">${message}</span>
                <span style="opacity: 0.7; font-size: 18px; cursor: pointer;">×</span>
            </div>
        `;

        // Clic pour fermer
        toast.addEventListener('click', () => {
            this.remove(id);
        });

        return toast;
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    remove(id) {
        const toast = this.toasts.get(id);
        if (toast && toast.parentNode) {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toasts.delete(id);
            }, 300);
        }
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// Instance globale
window.Toast = new ToastManager();

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastManager;
}
