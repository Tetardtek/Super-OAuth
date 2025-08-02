/**
 * Composant de monitoring du serveur SuperOAuth
 * @version 1.0.0
 */

import { UI, Logger } from './utils.js';

export class ServerMonitorComponent {
    constructor(authService) {
        this.authService = authService;
        this.monitorInterval = null;
        this.isMonitoring = false;
    }

    // Initialiser le monitoring
    initialize() {
        Logger.info('Initialisation du monitoring serveur');
        
        // Vérification initiale
        this.checkHealth();
        
        // Monitoring automatique toutes les 30 secondes
        this.startAutoMonitoring(30000);
        
        // Event listener pour le bouton de vérification manuelle
        const checkButton = document.querySelector('[onclick="checkServerHealth()"]');
        if (checkButton) {
            checkButton.addEventListener('click', () => this.checkHealth());
        }
    }

    // Démarrer le monitoring automatique
    startAutoMonitoring(interval = 30000) {
        if (this.isMonitoring) {
            this.stopAutoMonitoring();
        }
        
        this.monitorInterval = setInterval(() => {
            this.checkHealth(true); // Mode silencieux pour les vérifications automatiques
        }, interval);
        
        this.isMonitoring = true;
        Logger.info(`Monitoring automatique démarré (${interval/1000}s)`);
    }

    // Arrêter le monitoring automatique
    stopAutoMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            this.isMonitoring = false;
            Logger.info('Monitoring automatique arrêté');
        }
    }

    // Vérifier l'état de santé du serveur
    async checkHealth(silent = false) {
        if (!silent) {
            Logger.info('Vérification manuelle de l\'état du serveur');
        }
        
        const result = await this.authService.checkHealth();
        
        this.updateServerStatus(result);
        
        if (!silent) {
            this.updateHealthResponse(result);
        }
        
        return result;
    }

    // Mettre à jour l'indicateur de statut
    updateServerStatus(result) {
        const statusDot = document.getElementById('serverStatus');
        const statusText = document.getElementById('serverStatusText');
        
        if (!statusDot || !statusText) {
            return;
        }
        
        if (result.success && result.online) {
            statusDot.className = 'status-dot status-online';
            
            const environment = result.data?.environment || 'unknown';
            const version = result.data?.version || '';
            statusText.textContent = `En ligne - ${environment}${version ? ` (${version})` : ''}`;
        } else {
            statusDot.className = 'status-dot status-offline';
            statusText.textContent = 'Hors ligne';
        }
    }

    // Mettre à jour la zone de réponse détaillée
    updateHealthResponse(result) {
        const responseDiv = document.getElementById('healthResponse');
        if (!responseDiv) {
            return;
        }
        
        UI.showElement('healthResponse');
        
        if (result.success && result.online) {
            // Formater les données de santé
            const healthData = {
                status: 'En ligne',
                timestamp: new Date().toLocaleString('fr-FR'),
                ...result.data
            };
            
            UI.setHTML('healthResponse', JSON.stringify(healthData, null, 2));
        } else {
            const errorData = {
                status: 'Hors ligne',
                timestamp: new Date().toLocaleString('fr-FR'),
                error: result.error?.message || 'Serveur inaccessible'
            };
            
            UI.setHTML('healthResponse', JSON.stringify(errorData, null, 2));
        }
    }

    // Obtenir les statistiques de monitoring
    getStats() {
        return {
            isMonitoring: this.isMonitoring,
            interval: this.monitorInterval ? 30000 : null,
            lastCheck: new Date().toLocaleString('fr-FR')
        };
    }

    // Nettoyer les ressources
    cleanup() {
        this.stopAutoMonitoring();
        Logger.info('Composant de monitoring nettoyé');
    }
}
