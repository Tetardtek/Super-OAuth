<script lang="ts">
	import { toasts, dismissToast } from '$stores/toast';
</script>

{#if $toasts.length > 0}
	<div class="toast-container">
		{#each $toasts as toast (toast.id)}
			<div class="toast toast-{toast.type}" role="alert">
				<span class="toast-message">{toast.message}</span>
				<button class="toast-close" onclick={() => dismissToast(toast.id)}>&times;</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: var(--space-lg);
		right: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		z-index: 200;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		animation: slideIn 0.2s ease;
		min-width: 280px;
		max-width: 420px;
	}

	.toast-success { background: rgba(74, 222, 128, 0.15); border: 1px solid rgba(74, 222, 128, 0.3); color: var(--success); }
	.toast-error { background: rgba(248, 113, 113, 0.15); border: 1px solid rgba(248, 113, 113, 0.3); color: var(--danger); }
	.toast-info { background: rgba(96, 165, 250, 0.15); border: 1px solid rgba(96, 165, 250, 0.3); color: var(--info); }
	.toast-warning { background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); color: var(--warning); }

	.toast-message { flex: 1; }

	.toast-close {
		background: none;
		border: none;
		color: inherit;
		font-size: var(--text-lg);
		cursor: pointer;
		opacity: 0.6;
		padding: 0;
		line-height: 1;
	}

	.toast-close:hover { opacity: 1; }

	@keyframes slideIn {
		from { transform: translateX(100%); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
</style>
