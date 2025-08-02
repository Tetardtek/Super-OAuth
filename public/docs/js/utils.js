// Utilitaires pour la documentation
export class DocsUtils {
    // Gestion du DOM
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        const fade = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = Math.min(progress / duration, 1);
            
            element.style.opacity = opacity;
            
            if (progress < duration) {
                requestAnimationFrame(fade);
            }
        };
        
        requestAnimationFrame(fade);
    }
    
    static fadeOut(element, duration = 300) {
        let start = null;
        const fade = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = Math.max(1 - (progress / duration), 0);
            
            element.style.opacity = opacity;
            
            if (progress < duration) {
                requestAnimationFrame(fade);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(fade);
    }
    
    // Gestion du loading
    static showLoading(container, message = 'Chargement...') {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px; color: #666;">${message}</p>
            </div>
        `;
    }
    
    // Gestion des erreurs
    static showError(container, message = 'Une erreur est survenue') {
        container.innerHTML = `
            <div class="error-message">
                <h4>❌ Erreur</h4>
                <p>${message}</p>
            </div>
        `;
    }
    
    // Copie de texte
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback pour les anciens navigateurs
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        }
    }
    
    // Feedback visuel
    static showFeedback(message, type = 'success') {
        const feedback = document.createElement('div');
        feedback.className = `copy-feedback ${type}`;
        feedback.textContent = message;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.classList.add('show'), 10);
        
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => document.body.removeChild(feedback), 300);
        }, 2000);
    }
    
    // Debounce pour la recherche
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Requêtes HTTP
    static async fetchContent(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            throw error;
        }
    }
    
    // Highlighting de recherche
    static highlightSearchTerms(container, searchTerm) {
        if (!searchTerm) {
            // Supprimer les highlights existants
            container.innerHTML = container.innerHTML.replace(/<mark class="highlight">(.*?)<\/mark>/g, '$1');
            return;
        }
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        container.innerHTML = container.innerHTML.replace(regex, '<mark class="highlight">$1</mark>');
    }
    
    // Smooth scroll
    static smoothScrollTo(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}
