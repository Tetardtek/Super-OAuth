/**
 * Utilitaires partagés entre l'application et la documentation
 * @version 1.0.0
 */

export class SharedUtils {
    // Copie de texte dans le presse-papiers
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback pour les environnements non-sécurisés
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (error) {
            console.error('Erreur lors de la copie:', error);
            return false;
        }
    }

    // Feedback visuel unifié
    static showFeedback(message, type = 'success', duration = 2000) {
        // Éviter les duplications de feedback
        const existingFeedback = document.querySelector('.shared-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        const feedback = document.createElement('div');
        feedback.className = `shared-feedback feedback-${type}`;
        feedback.textContent = message;
        
        // Styles inline pour indépendance
        Object.assign(feedback.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease',
            backgroundColor: type === 'success' ? '#4ECDC4' : 
                           type === 'error' ? '#FF6B6B' : '#FFA726'
        });
        
        document.body.appendChild(feedback);
        
        // Animation d'entrée
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(0)';
        }, 10);
        
        // Animation de sortie
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, duration);
    }

    // Debounce optimisé
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) func.apply(this, args);
        };
    }

    // Animation de fondu unifié
    static fadeIn(element, duration = 300) {
        return new Promise((resolve) => {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            const start = performance.now();
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    static fadeOut(element, duration = 300) {
        return new Promise((resolve) => {
            const start = performance.now();
            const startOpacity = parseFloat(getComputedStyle(element).opacity);
            
            const animate = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = startOpacity * (1 - progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    // Smooth scroll unifié
    static smoothScrollTo(element) {
        if (element && element.scrollIntoView) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    // Validation d'email unifiée
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Formatage de date unifié
    static formatDate(dateInput) {
        if (!dateInput) return 'Non défini';
        
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Date invalide';
        
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static formatDateTime(dateInput) {
        if (!dateInput) return 'Non défini';
        
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Date invalide';
        
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
