import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

// Driven Adapters
import { WebCryptoAdapter } from '@adapters/crypto/webcrypto.adapter';
import { IdbStorageAdapter } from '@adapters/storage/idb-storage.adapter';
import { CanvasImageProcessor } from '@adapters/image/canvas-processor.adapter';
import { BlossomBlobAdapter } from '@adapters/blobstore/blossom-blob.adapter';
import { NostrSignalingAdapter } from '@adapters/signaling/nostr-signaling.adapter';
import { FflatePackerAdapter } from '@adapters/archive/fflate-packer.adapter';

// Driving Services
import { RoomHostService } from '@core/services/room-host.service';
import { ImageUploaderService } from '@core/services/uploader.service';
import type { AppServices } from '@ui/types';

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

export const DEFAULT_BLOSSOM_SERVER = 'https://nostr.download';

// 1. Instantiate Adapters
const cryptoAdapter = new WebCryptoAdapter();
const storageAdapter = new IdbStorageAdapter();
const imageProcessor = new CanvasImageProcessor();
const blobAdapter = new BlossomBlobAdapter();
const signalingAdapter = new NostrSignalingAdapter();
const archivePacker = new FflatePackerAdapter();

// 2. Instantiate Domain Services
const hostService = new RoomHostService({
  storage: storageAdapter,
  signaling: signalingAdapter,
  blobStore: blobAdapter,
  crypto: cryptoAdapter,
  imageProcessor,
  archivePacker,
  relayUrls: DEFAULT_RELAYS,
});

// src/ui/main.ts

const uploaderService = new ImageUploaderService({
  imageProcessor,
  cryptoProvider: cryptoAdapter,
  blobStore: blobAdapter,
  signaling: signalingAdapter,
  storage: storageAdapter,
  blossomServerUrl: DEFAULT_BLOSSOM_SERVER,
  relayUrls: DEFAULT_RELAYS,
});

export const services: AppServices = {
  hostService,
  uploaderService,
  signalingAdapter,
};

// 3. Mount Svelte 5 App
const target = document.getElementById('app');
if (!target) {
  throw new Error('Root #app container not found in index.html');
}

const app = mount(App, {
  target,
  props: {
    services,
  },
});

export default app;