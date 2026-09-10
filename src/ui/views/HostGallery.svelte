<script lang="ts">
  import type { IRoomHostService } from '@core/ports/input';
  import type { GalleryThumbnailItem, MediaPayload } from '@core/domain/models';
  import ConfirmModal from '../components/ConfirmModal.svelte';

  interface Props {
    hostService: IRoomHostService;
    onNavigateSlideshow: () => void;
  }

  let { hostService, onNavigateSlideshow }: Props = $props();

  let thumbnails = $state<GalleryThumbnailItem[]>([]);
  let previewMedia = $state<MediaPayload | null>(null);
  let previewUrl = $state<string | null>(null);

  let deleteCandidateId = $state<string | null>(null);
  let isExportingZip = $state<boolean>(false);

  async function loadThumbnails() {
    thumbnails = await hostService.getGalleryThumbnails();
  }

  $effect(() => {
    loadThumbnails();
  });

  async function openPreview(id: string) {
    const full = await hostService.getFullImage(id);
    if (!full) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const blob = new Blob([full.fullBlob.buffer as ArrayBuffer], {
      type: full.mimeType,
    });
    previewUrl = URL.createObjectURL(blob);
    previewMedia = full;
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    previewMedia = null;
  }

  async function confirmDelete() {
    if (!deleteCandidateId) return;
    await hostService.deleteMedia(deleteCandidateId);
    deleteCandidateId = null;
    if (previewMedia?.id === deleteCandidateId) closePreview();
    await loadThumbnails();
  }

  async function handleExportZip() {
    isExportingZip = true;
    try {
      const zipBytes = await hostService.exportAllAsZip();
      const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
        type: 'application/zip',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slideshow_export_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      isExportingZip = false;
    }
  }

  function getObjectUrl(thumbBytes: Uint8Array): string {
    const blob = new Blob([thumbBytes.buffer as ArrayBuffer], {
      type: 'image/webp',
    });
    return URL.createObjectURL(blob);
  }
</script>

<div class="gallery-container">
  <header class="gallery-header">
    <button type="button" class="btn" onclick={onNavigateSlideshow}>
      ← Back to Slideshow
    </button>
    <h2>Photo Wall Moderation ({thumbnails.filter((t) => !t.isDeleted).length})</h2>
    <button
      type="button"
      class="btn primary-btn"
      disabled={isExportingZip}
      onclick={handleExportZip}
    >
      {isExportingZip ? 'Packing ZIP...' : 'Export ZIP'}
    </button>
  </header>

  <div class="grid">
    {#each thumbnails as item}
      <div class="thumb-card" class:deleted={item.isDeleted}>
        <img
          src={getObjectUrl(item.thumbBlob)}
          alt="Thumbnail"
          class="thumb-img"
          onclick={() => openPreview(item.id)}
        />
        <div class="thumb-footer">
          <span class="hash-tag">#{item.sha256.slice(0, 6)}</span>
          {#if !item.isDeleted}
            <button
              type="button"
              class="del-btn"
              onclick={() => (deleteCandidateId = item.id)}
            >
              Remove
            </button>
          {:else}
            <span class="deleted-label">Removed</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  {#if previewUrl}
    <div class="preview-backdrop" onclick={closePreview} role="presentation">
      <div class="preview-modal" onclick={(e) => e.stopPropagation()} role="dialog">
        <img src={previewUrl} alt="Full resolution preview" class="full-img" />
        <div class="preview-actions">
          <button type="button" class="btn" onclick={closePreview}>Close</button>
        </div>
      </div>
    </div>
  {/if}

  <ConfirmModal
    open={deleteCandidateId !== null}
    title="Remove Photo from Slideshow?"
    message="This photo will be immediately excluded from the live slideshow loop."
    danger={true}
    confirmLabel="Remove"
    onconfirm={confirmDelete}
    oncancel={() => (deleteCandidateId = null)}
  />
</div>

<style>
  .gallery-container {
    padding: 1.5rem;
    max-width: 80rem;
    margin: 0 auto;
    width: 100%;
  }
  .gallery-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  .btn {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }
  .primary-btn {
    background: #0284c7;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }
  .thumb-card {
    background: #1e293b;
    border-radius: 0.5rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .thumb-card.deleted {
    opacity: 0.35;
    filter: grayscale(1);
  }
  .thumb-img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    cursor: pointer;
  }
  .thumb-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    font-size: 0.75rem;
  }
  .hash-tag {
    font-family: monospace;
    color: #94a3b8;
  }
  .del-btn {
    background: none;
    border: none;
    color: #f87171;
    cursor: pointer;
  }
  .deleted-label {
    color: #ef4444;
  }
  .preview-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }
  .preview-modal {
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .full-img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 0.5rem;
  }
</style>