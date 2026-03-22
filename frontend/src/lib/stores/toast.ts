import { writable } from 'svelte/store';

interface ToastItem {
	id: number;
	type: 'success' | 'error' | 'info' | 'warning';
	message: string;
}

let nextId = 0;

export const toasts = writable<ToastItem[]>([]);

function addToast(type: ToastItem['type'], message: string, duration = 4000) {
	const id = nextId++;
	toasts.update((t) => [...t, { id, type, message }]);
	setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id: number) {
	toasts.update((t) => t.filter((toast) => toast.id !== id));
}

export const toast = {
	success: (msg: string) => addToast('success', msg),
	error: (msg: string) => addToast('error', msg),
	info: (msg: string) => addToast('info', msg),
	warning: (msg: string) => addToast('warning', msg)
};
