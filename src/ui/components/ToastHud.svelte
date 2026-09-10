<script lang="ts">
  interface Props {
    count: number;
    visible: boolean;
  }

  let { count, visible }: Props = $props();
</script>

{#if visible && count > 0}
  <div class="toast-badge" role="status" aria-live="polite">
    <span class="pulse-dot"></span>
    <span class="toast-text">
      +{count} new {count === 1 ? 'photo' : 'photos'} added
    </span>
  </div>
{/if}

<style>
  .toast-badge {
    position: fixed;
    top: 2rem;
    right: 2rem;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 9999px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-text {
    color: #f8fafc;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.025em;
  }

  .pulse-dot {
    width: 0.625rem;
    height: 0.625rem;
    background: #38bdf8;
    border-radius: 50%;
    box-shadow: 0 0 12px #38bdf8;
    animation: pulse 1.5s infinite;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-1rem) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(0.85);
    }
  }
</style>