/**
 * Logger utilities - Système de logging
 * @version 1.0.0
 */

export const Logger = {
    info(message, ...args) {
        console.log(`ℹ️ ${message}`, ...args);
    },

    success(message, ...args) {
        console.log(`✅ ${message}`, ...args);
    },

    error(message, ...args) {
        console.error(`❌ ${message}`, ...args);
    },

    warn(message, ...args) {
        console.warn(`⚠️ ${message}`, ...args);
    },

    debug(message, ...args) {
        console.log(`🔧 ${message}`, ...args);
    }
};
