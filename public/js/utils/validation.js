/**
 * Validation utilities - Fonctions de validation
 * @version 1.0.0
 */

import { SharedUtils } from '../shared-utils.js';

export const Validation = {
    email(email) {
        return SharedUtils.isValidEmail(email);
    },

    isEmail(email) {
        return this.email(email);
    },

    isPasswordStrong(password) {
        // Au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    },

    passwordsMatch(password1, password2) {
        // Handle null/undefined cases
        if (!password1 || !password2) return false;
        return password1 === password2 && password1.length > 0;
    }
};
