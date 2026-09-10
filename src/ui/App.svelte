<script lang="ts">
  import type { AppServices } from './types';
  import HostDashboard from './views/HostDashboard.svelte';
  import HostGallery from './views/HostGallery.svelte';
  import MobileUploader from './views/MobileUploader.svelte';

  interface Props {
    services: AppServices;
  }

  let { services }: Props = $props();

  type Route = 'host-slideshow' | 'host-gallery' | 'uploader' | 'loading';

  let currentRoute = $state<Route>('loading');
  let roomNpub = $state<string>('');
  let currentTargetRes = $state<{ width: number; height: number }>({ width: 1920, height: 1080 });

  function parseHashRoute() {
    const hash = window.location.hash || '';

    // 1. Mobile Attendee Join Route: #/join?room=<npub>&w=1920&h=1080
    if (hash.startsWith('#/join')) {
      const queryStr = hash.split('?')[1] || '';
      const params = new URLSearchParams(queryStr);
      roomNpub = params.get('room') || '';
      const w = parseInt(params.get('w') || '1920', 10);
      const h = parseInt(params.get('h') || '1080', 10);
      currentTargetRes = { width: w, height: h };
      currentRoute = 'uploader';
      return;
    }

    // 2. Host Gallery View Route: #/gallery
    if (hash === '#/gallery') {
      currentRoute = 'host-gallery';
      return;
    }

    // 3. Default Host Route (Slideshow)
    currentRoute = 'host-slideshow';
  }

  $effect(() => {
    parseHashRoute();
    window.addEventListener('hashchange', parseHashRoute);
    return () => {
      window.removeEventListener('hashchange', parseHashRoute);
    };
  });
</script>

<main class="app-shell">
  {#if currentRoute === 'uploader'}
    <MobileUploader
      uploaderService={services.uploaderService}
      {roomNpub}
      targetResolution={currentTargetRes}
    />
  {:else if currentRoute === 'host-slideshow'}
    <HostDashboard
      hostService={services.hostService}
      signalingAdapter={services.signalingAdapter}
      onNavigateGallery={() => { window.location.hash = '#/gallery'; }}
    />
  {:else if currentRoute === 'host-gallery'}
    <HostGallery
      hostService={services.hostService}
      onNavigateSlideshow={() => { window.location.hash = '#/'; }}
    />
  {:else}
    <div class="loading-screen">
      <div class="spinner"></div>
      <p>Loading application...</p>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #090d16;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  .app-shell {
    min-height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
  }

  .loading-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: #94a3b8;
  }

  .spinner {
    width: 2.5rem;
    height: 2.5rem;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>