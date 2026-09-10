<script lang="ts">
  import type { IRoomHostService } from '@core/ports/input';
  import type { NostrSignalingAdapter } from '@adapters/signaling/nostr-signaling.adapter';
  import type { MediaPayload } from '@core/domain/models';
  import QrCodeWithLink from '../components/QrCodeWithLink.svelte';
  import ToastHud from '../components/ToastHud.svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';

  interface Props {
    hostService: IRoomHostService;
    signalingAdapter: NostrSignalingAdapter;
    onNavigateGallery: () => void;
  }

  let { hostService, signalingAdapter, onNavigateGallery }: Props = $props();

  let currentImage = $state<MediaPayload | null>(null);
  let currentImageUrl = $state<string | null>(null);
  let isFullscreen = $state<boolean>(false);
  let speedInterval = $state<number>(5000);
  let loopTimer = $state<ReturnType<typeof setInterval> | null>(null);

  let newPhotosCount = $state<number>(0);
  let showToast = $state<boolean>(false);
  let joinUrl = $state<string>('');
  let showPurgeModal = $state<boolean>(false);

  async function stepNext() {
    const nextItem = await hostService.getNextSlideshowItem();
    if (!nextItem) return;

    if (currentImageUrl) {
      URL.revokeObjectURL(currentImageUrl);
    }
    const blob = new Blob([nextItem.fullBlob.buffer as ArrayBuffer], {
      type: nextItem.mimeType,
    });
    currentImageUrl = URL.createObjectURL(blob);
    currentImage = nextItem;
  }

  function startLoop() {
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = setInterval(stepNext, speedInterval);
  }

  $effect(() => {
    (async () => {
      const room = await hostService.initRoom();
      signalingAdapter.setHostPrivateKey(room.privateKeyHex);

      const base = window.location.origin + window.location.pathname;
      joinUrl = `${base}#/join?room=${room.publicKeyHex}&w=1920&h=1080`;

      await hostService.startSync((count) => {
        newPhotosCount = count;
        showToast = true;
        setTimeout(() => {
          showToast = false;
        }, 4000);
      });

      await stepNext();
      startLoop();
    })();

    return () => {
      if (loopTimer) clearInterval(loopTimer);
      if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
      hostService.stopSync();
    };
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      isFullscreen = true;
    } else {
      document.exitFullscreen();
      isFullscreen = false;
    }
  }

  async function handlePurgeRoom() {
    await hostService.purgeRoom();
    window.location.reload();
  }
</script>

<div class="dashboard-root" class:fullscreen-mode={isFullscreen}>
  <ToastHud count={newPhotosCount} visible={showToast} />

  {#if currentImageUrl}
    <img src={currentImageUrl} alt="Live Slideshow Item" class="slide-view" />
  {:else}
    <div class="empty-state">
      <h3>Waiting for incoming photos...</h3>
      <p>Scan the code on a mobile device to add images.</p>
    </div>
  {/if}

  <div class="controls-overlay">
    <div class="control-cluster">
      <button type="button" class="ctrl-btn" onclick={toggleFullscreen}>
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
      <button type="button" class="ctrl-btn" onclick={onNavigateGallery}>
        Gallery
      </button>
      <select
        class="ctrl-select"
        bind:value={speedInterval}
        onchange={() => startLoop()}
      >
        <option value={2000}>2s</option>
        <option value={5000}>5s</option>
        <option value={10000}>10s</option>
        <option value={30000}>30s</option>
      </select>
      <button
        type="button"
        class="ctrl-btn danger"
        onclick={() => (showPurgeModal = true)}
      >
        Purge Room
      </button>
    </div>

    {#if !isFullscreen && joinUrl}
      <div class="qr-dock">
        <QrCodeWithLink url={joinUrl} label="Scan to Upload" />
      </div>
    {/if}
  </div>

  <ConfirmModal
    open={showPurgeModal}
    title="Purge Entire Room?"
    message="This will irrevocably wipe all room private keys and downloaded media from this browser."
    danger={true}
    confirmLabel="Purge Everything"
    onconfirm={handlePurgeRoom}
    oncancel={() => (showPurgeModal = false)}
  />
</div>

<style>
  .dashboard-root {
    position: relative;
    width: 100vw;
    height: 100vh;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .slide-view {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    user-select: none;
  }
  .empty-state {
    text-align: center;
    color: #64748b;
  }
  .controls-overlay {
    position: absolute;
    bottom: 1.5rem;
    left: 1.5rem;
    right: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    pointer-events: none;
  }
  .control-cluster {
    display: flex;
    gap: 0.5rem;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    padding: 0.5rem;
    border-radius: 0.75rem;
    pointer-events: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .ctrl-btn,
  .ctrl-select {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .ctrl-btn.danger {
    background: rgba(220, 38, 38, 0.4);
    color: #fca5a5;
  }
  .qr-dock {
    pointer-events: auto;
  }
</style>