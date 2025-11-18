/**
 * Error Handler utilities - Gestion des erreurs
 * @version 1.0.0
 */

import { UI } from './ui.js';

export const ErrorHandler = {
    handle(error, responseDiv) {
        console.error('❌ Error:', error);

        if (responseDiv) {
            UI.showElement(responseDiv);
            UI.setHTML(responseDiv, `
                <div style="color: #f56565;">❌ Erreur: ${error.message}</div>
            `);
        }
    },

    handleAPIError(response, responseDiv) {
        if (!response.ok) {
            const errorMessage = response.data?.message || 'Erreur inconnue';
            if (responseDiv) {
                UI.showElement(responseDiv);
                UI.setHTML(responseDiv, `
                    <div style="color: #f56565;">❌ Erreur: ${errorMessage}</div>
                    <details style="margin-top: 10px;">
                        <summary style="cursor: pointer; color: #4299e1;">📋 Détails</summary>
                        <pre style="margin-top: 5px;">${JSON.stringify(response.data, null, 2)}</pre>
                    </details>
                `);
            }
            return false;
        }
        return true;
    }
};
