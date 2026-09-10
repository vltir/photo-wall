<script lang="ts">
  import QRCode from 'qrcode';

  interface Props {
    url: string;
    label?: string;
  }

  let { url, label = 'Scan to Join & Upload' }: Props = $props();

  let qrDataUrl = $state<string>('');
  let copied = $state<boolean>(false);

  $effect(() => {
    if (url) {
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#00000000',
        },
      }).then((data) => {
        qrDataUrl = data;
      });
    }
  });

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<div class="qr-container">
  {#if label}
    <h4 class="qr-label">{label}</h4>
  {/if}

  <div class="qr-frame">
    {#if qrDataUrl}
      <img src={qrDataUrl} alt="QR Code" class="qr-image" />
    {:else}
      <div class="qr-skeleton"></div>
    {/if}
  </div>

  <div class="url-bar">
    <input type="text" readonly value={url} class="url-input" />
    <button type="button" class="copy-btn" onclick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  </div>
</div>

<style>
  .qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1rem;
    max-width: 24rem;
    width: 100%;
  }

  .qr-label {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .qr-frame {
    width: 240px;
    height: 240px;
    background: #0f172a;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  .qr-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .qr-skeleton {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0.5rem;
  }

  .url-bar {
    display: flex;
    width: 100%;
    gap: 0.5rem;
  }

  .url-input {
    flex: 1;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: #94a3b8;
    font-size: 0.8rem;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .url-input:focus {
    outline: none;
    border-color: #38bdf8;
  }

  .copy-btn {
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.2s;
    min-width: 5rem;
  }

  .copy-btn:hover {
    background: #0369a1;
  }
</style>