import type {
  GalleryThumbnailItem,
  MediaPayload,
  RoomInitResult,
  SignalingPayload,
} from '../domain/models';
import type { IRoomHostService } from '../ports/input';
import type {
  IArchivePacker,
  IBlobStoreTransport,
  ICryptoProvider,
  IImageProcessor,
  ISignalingTransport,
  IStorageAdapter,
} from '../ports/output';
import { SlideshowPlaylist } from '../domain/slideshow-policy';

export interface RoomHostServiceDependencies {
  readonly storage: IStorageAdapter;
  readonly signaling: ISignalingTransport;
  readonly blobStore: IBlobStoreTransport;
  readonly crypto: ICryptoProvider;
  readonly imageProcessor: IImageProcessor;
  readonly archivePacker: IArchivePacker;
  readonly relayUrls: string[];
}

export class RoomHostService implements IRoomHostService {
  private activeRoomId: string | null = null;
  private activePublicKeyHex: string | null = null;
  private unsubscribeSignaling: (() => void) | null = null;
  private readonly playlist = new SlideshowPlaylist();

  constructor(private readonly deps: RoomHostServiceDependencies) {}

  public async initRoom(existingPrivateKeyHex?: string): Promise<RoomInitResult> {
    let privateKey = existingPrivateKeyHex;
    let publicKey: string;

    if (privateKey) {
      // Re-hydrate or adopt existing room
      const existingSecret = await this.deps.storage.getRoomSecret(privateKey);
      publicKey = existingSecret ?? privateKey; // Adapter or crypto can map priv -> pub
    } else {
      const generated = this.deps.crypto.generateAsymmetricKeyPair();
      privateKey = generated.privateKeyHex;
      publicKey = generated.publicKeyHex;
    }

    this.activeRoomId = publicKey;
    this.activePublicKeyHex = publicKey;
    await this.deps.storage.saveRoomSecret(this.activeRoomId, privateKey);

    // Warm up the playlist with existing non-deleted media
    const existing = await this.deps.storage.listMetadata();
    const validIds = existing.filter((item) => !item.isDeleted).map((item) => item.id);
    this.playlist.clear();
    this.playlist.addItems(validIds, false);

    return {
      roomId: this.activeRoomId,
      publicKeyHex: publicKey,
      privateKeyHex: privateKey,
    };
  }

  public async startSync(onNewMediaBadge: (newCount: number) => void): Promise<void> {
    if (!this.activePublicKeyHex) {
      throw new Error('Room not initialized. Call initRoom() prior to starting sync.');
    }

    await this.deps.signaling.connect(this.deps.relayUrls);

    const existingMedia = await this.deps.storage.listMetadata();
    const latestTimestamp = existingMedia.reduce(
      (max, item) => (item.uploadedAt > max ? item.uploadedAt : max),
      0
    );

    // Replay buffer: 300 seconds prior to latest sync to capture any network lag
    const sinceTimestamp = Math.max(0, latestTimestamp - 300);

    this.unsubscribeSignaling = await this.deps.signaling.subscribe(
      this.activePublicKeyHex,
      sinceTimestamp,
      async (signal: SignalingPayload) => {
        try {
          await this.ingestSignal(signal);
          onNewMediaBadge(1);
        } catch {
          // Discard invalid / tampered payloads safely without halting the sync loop
        }
      }
    );
  }

  public async stopSync(): Promise<void> {
    if (this.unsubscribeSignaling) {
      this.unsubscribeSignaling();
      this.unsubscribeSignaling = null;
    }
    await this.deps.signaling.disconnect();
  }

  public async getNextSlideshowItem(): Promise<MediaPayload | null> {
    const nextId = this.playlist.next();
    if (!nextId) return null;
    return this.deps.storage.getMedia(nextId);
  }

  public async getGalleryThumbnails(): Promise<GalleryThumbnailItem[]> {
    const metadata = await this.deps.storage.listMetadata();
    const itemsWithThumbs: GalleryThumbnailItem[] = [];

    for (const item of metadata) {
      const thumb = await this.deps.storage.getThumbnail(item.id);
      if (thumb) {
        itemsWithThumbs.push({
          ...item,
          thumbBlob: thumb,
        });
      }
    }

    return itemsWithThumbs.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  public async getFullImage(id: string): Promise<MediaPayload | null> {
    return this.deps.storage.getMedia(id);
  }

  public async deleteMedia(id: string): Promise<void> {
    await this.deps.storage.markDeleted(id, true);
    this.playlist.removeItem(id);
  }

  public async exportAllAsZip(): Promise<Uint8Array> {
    const metadata = await this.deps.storage.listMetadata();
    const activeMedia = metadata.filter((m) => !m.isDeleted);

    const filesToPack: Array<{ filename: string; data: Uint8Array }> = [];
    for (const entry of activeMedia) {
      const item = await this.deps.storage.getMedia(entry.id);
      if (item) {
        filesToPack.push({
          filename: `photo_${item.uploadedAt}_${item.id.slice(0, 8)}.webp`,
          data: item.fullBlob,
        });
      }
    }

    return this.deps.archivePacker.packZip(filesToPack);
  }

  public async purgeRoom(): Promise<void> {
    if (!this.activeRoomId) return;
    await this.stopSync();
    await this.deps.storage.clearRoom(this.activeRoomId);
    this.playlist.clear();
    this.activeRoomId = null;
    this.activePublicKeyHex = null;
  }

  private async ingestSignal(signal: SignalingPayload): Promise<void> {
    // 1. Download encrypted ciphertext from Blossom
    const encryptedBlob = await this.deps.blobStore.downloadBlob(signal.blobUrl);

    // 2. Parse AES Key and IV
    const key = await this.deps.crypto.importKeyHex(signal.encryptionKeyHex);
    const iv = new Uint8Array(
      signal.ivHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
    );

    // 3. Decrypt payload (WebCrypto rejects tampered data here)
    const decryptedFullBytes = await this.deps.crypto.decryptBytes(
      encryptedBlob,
      key,
      iv
    );

    // 4. Compute content hash
    const contentSha256 = await this.deps.crypto.computeSha256(decryptedFullBytes);

    // Deduplication check: ignore if already stored
    const existing = await this.deps.storage.getMedia(contentSha256);
    if (existing) return;

    // 5. Derive lightweight thumbnail locally on the host
    const thumbBytes = await this.deps.imageProcessor.generateThumbnail(
      decryptedFullBytes,
      240
    );

    // 6. Persist to storage
    const mediaItem: MediaPayload = {
      id: contentSha256,
      fullBlob: decryptedFullBytes,
      thumbBlob: thumbBytes,
      mimeType: 'image/webp',
      sha256: contentSha256,
      uploadedAt: signal.uploadedAt,
    };

    await this.deps.storage.saveMedia(mediaItem);
    this.playlist.addItems([contentSha256], true);
  }
}