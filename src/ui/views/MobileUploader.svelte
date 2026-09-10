<script lang="ts">
  import type { IImageUploaderService } from '@core/ports/input';
  import type { MediaDimensions, UploadProgressStage } from '@core/domain/models';

  interface Props {
    uploaderService: IImageUploaderService;
    roomNpub: string;
    targetResolution: MediaDimensions;
  }

  let { uploaderService, roomNpub, targetResolution }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let statusStage = $state<UploadProgressStage | 'idle' | 'success' | 'error'>('idle');
  let errorMessage = $state<string>('');
  let uploadHistory = $state<string[]>([]);

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    errorMessage = '';
    statusStage = 'compressing';

    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await uploaderService.uploadPhoto(
        roomNpub,
        roomNpub,
        buffer,
        {
          targetResolution,
          webpQuality: 0.82,
        },
        (stage) => {
          statusStage = stage;
        }
      );

      statusStage = 'success';
      uploadHistory = [result.sha256.slice(0, 8), ...uploadHistory];
      setTimeout(() => {
        statusStage = 'idle';
      }, 3000);
    } catch (err) {
      statusStage = 'error';
      errorMessage = err instanceof Error ? err.message : 'Upload failed.';
    } finally {
      if (fileInput) fileInput.value = '';
    }
  }
</script>

<div class="uploader-container">
  <header class="uploader-header">
    <div class="status-indicator"></div>
    <h2>Live Room Upload</h2>
    <p class="room-key">{roomNpub.slice(0, 12)}...{roomNpub.slice(-6)}</p>
  </header>

  <div class="actions-card">
    <input
      type="file"
      accept="image/*"
      capture="environment"
      bind:this={fileInput}
      onchange={handleFileSelect}
      class="hidden-input"
      id="camera-input"
    />

    <button
      type="button"
      class="primary-btn capture-btn"
      disabled={statusStage !== 'idle' && statusStage !== 'success' && statusStage !== 'error'}
      onclick={() => fileInput?.click()}
    >
      <span class="btn-icon">📷</span>
      <span>Snap & Upload Photo</span>
    </button>
  </div>

  {#if statusStage !== 'idle'}
    <div class="progress-box" class:error={statusStage === 'error'} class:success={statusStage === 'success'}>
      {#if statusStage === 'compressing'}
        <p>1/4 Optimizing & stripping EXIF...</p>
      {:else if statusStage === 'encrypting'}
        <p>2/4 Encrypting AES-256-GCM...</p>
      {:else if statusStage === 'uploading'}
        <p>3/4 Uploading to Blossom Blobstore...</p>
      {:else if statusStage === 'signaling'}
        <p>4/4 Relaying Nostr NIP-59 signal...</p>
      {:else if statusStage === 'success'}
        <p class="success-text">✓ Photo added to live slideshow!</p>
      {:else if statusStage === 'error'}
        <p class="error-text">✕ {errorMessage}</p>
      {/if}
    </div>
  {/if}

  {#if uploadHistory.length > 0}
    <div class="history-card">
      <h4>Session Uploads ({uploadHistory.length})</h4>
      <div class="history-chips">
        {#each uploadHistory as hash}
          <span class="chip">#{hash}</span>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .uploader-container {
    max-width: 28rem;
    margin: 0 auto;
    padding: 2rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .uploader-header {
    text-align: center;
  }
  .status-indicator {
    width: 0.75rem;
    height: 0.75rem;
    background: #10b981;
    border-radius: 50%;
    margin: 0 auto 0.5rem;
    box-shadow: 0 0 10px #10b981;
  }
  .room-key {
    font-family: monospace;
    color: #64748b;
    font-size: 0.85rem;
  }
  .actions-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .hidden-input {
    display: none;
  }
  .primary-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.25rem;
    background: #0284c7;
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    border: none;
    border-radius: 1rem;
    cursor: pointer;
    box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.5);
  }
  .primary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .progress-box {
    background: #1e293b;
    padding: 1rem;
    border-radius: 0.75rem;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.9rem;
  }
  .progress-box.success {
    border-color: #10b981;
    color: #10b981;
  }
  .progress-box.error {
    border-color: #ef4444;
    color: #ef4444;
  }
  .history-card {
    background: #0f172a;
    padding: 1rem;
    border-radius: 0.75rem;
  }
  .history-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .chip {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-family: monospace;
    font-size: 0.75rem;
    color: #94a3b8;
  }
</style>