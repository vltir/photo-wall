<script lang="ts">
  let currentRoute = $state(window.location.hash || '#/');

  window.addEventListener('hashchange', () => {
    currentRoute = window.location.hash || '#/';
  });
</script>

<main class="app-container">
  {#if currentRoute.startsWith('#/join')}
    <section class="view-card">
      <h1>Photo Upload</h1>
      <p class="muted">Mobile Uploader View</p>
    </section>
  {:else}
    <section class="view-card">
      <h1>Slideshow Host Dashboard</h1>
      <p class="muted">Slideshow and Room Administration</p>
      <nav class="links">
        <a href="#/join?room=test">to Uploader View</a>
      </nav>
    </section>
  {/if}
</main>

<style>
  .app-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 1.5rem;
  }
  .view-card {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: 12px;
    padding: 2rem;
    max-width: 480px;
    width: 100%;
    text-align: center;
  }
  .muted {
    color: var(--text-muted);
    margin-top: 0.5rem;
  }
  .links {
    margin-top: 1.5rem;
  }
  a {
    color: var(--accent-primary);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
</style>