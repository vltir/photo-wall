import { mount } from 'svelte';
import './app.css';
import App from './ui/App.svelte';

// const storage = new IdbStorageAdapter();
// const signaling = new NostrSignalingAdapter();
// const hostService = new RoomHostService(storage, signaling, ...);

const target = document.getElementById('app');

if (!target) {
  throw new Error('Root #app element not found');
}

const app = mount(App, {
  target,
  props: {
    // hostService,
    // uploaderService
  }
});

export default app;