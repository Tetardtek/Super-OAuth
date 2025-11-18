/**
 * UI utilities - Helpers pour manipuler le DOM
 * @version 1.0.0
 */

export const UI = {
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'block';
    },

    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'none';
    },

    clearValue(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.value = '';
    },

    setValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.value = value;
    },

    getValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    },

    setHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) element.innerHTML = html;
    },

    setBorderColor(elementId, color) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.borderColor = color;
            element.style.boxShadow = color === '#ddd' ? 'none' : `0 0 5px ${color}33`;
        }
    }
};
