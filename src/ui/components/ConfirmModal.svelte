<script lang="ts">
  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let {
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    onconfirm,
    oncancel,
  }: Props = $props();
</script>

{#if open}
  <div class="modal-backdrop" onclick={oncancel} role="presentation">
    <div
      class="modal-card"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <h3 class="modal-title" class:danger-title={danger}>{title}</h3>
      <p class="modal-message">{message}</p>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick={oncancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          class="btn"
          class:btn-danger={danger}
          class:btn-primary={!danger}
          onclick={onconfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    padding: 1.5rem;
  }

  .modal-card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 1.75rem;
    max-width: 28rem;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
  }

  .modal-title {
    margin: 0 0 0.75rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f8fafc;
  }

  .danger-title {
    color: #f87171;
  }

  .modal-message {
    margin: 0 0 1.5rem 0;
    font-size: 0.95rem;
    line-height: 1.5;
    color: #94a3b8;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 0.5rem;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
  }
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .btn-primary {
    background: #0284c7;
    color: #ffffff;
  }
  .btn-primary:hover {
    background: #0369a1;
  }

  .btn-danger {
    background: #dc2626;
    color: #ffffff;
  }
  .btn-danger:hover {
    background: #b91c1c;
  }
</style>