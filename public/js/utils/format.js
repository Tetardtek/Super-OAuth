/**
 * Format utilities - Fonctions de formatage
 * @version 1.0.0
 */

import { SharedUtils } from '../shared-utils.js';

export const Format = {
    date(dateInput) {
        return SharedUtils.formatDate(dateInput);
    },

    datetime(dateInput) {
        return SharedUtils.formatDateTime(dateInput);
    },

    capitalize(text) {
        if (!text || typeof text !== 'string') return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    avatarLetter(text) {
        if (!text || text.length === 0) return 'U';
        return text.charAt(0).toUpperCase();
    }
};
