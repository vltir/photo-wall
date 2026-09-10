import type { IStorageAdapter } from '@core/ports/output';
import type { MediaPayload, StoredMediaMetadata } from '@core/domain/models';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface EphemeralSlideshowDB extends DBSchema {
  media: {
    key: string;
    value: {
      id: string;
      fullBlob: Uint8Array;
      thumbBlob: Uint8Array;
      mimeType: string;
      sha256: string;
      uploadedAt: number;
      isDeleted: boolean;
    };
    indexes: { 'by-upload-date': number };
  };
  rooms: {
    key: string;
    value: {
      roomId: string;
      secretKeyHex: string;
    };
  };
  uploads: {
    key: string;
    value: {
      key: string;
      roomId: string;
      sha256: string;
      timestamp: number;
    };
  };
}

const DB_NAME = 'ephemeral-slideshow-storage';
const DB_VERSION = 1;

export class IdbStorageAdapter implements IStorageAdapter {
  private readonly dbPromise: Promise<IDBPDatabase<EphemeralSlideshowDB>>;

  constructor() {
    this.dbPromise = openDB<EphemeralSlideshowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
          mediaStore.createIndex('by-upload-date', 'uploadedAt');
        }
        if (!db.objectStoreNames.contains('rooms')) {
          db.createObjectStore('rooms', { keyPath: 'roomId' });
        }
        if (!db.objectStoreNames.contains('uploads')) {
          db.createObjectStore('uploads', { keyPath: 'key' });
        }
      },
    });
  }

  public async saveMedia(media: MediaPayload): Promise<void> {
    const db = await this.dbPromise;
    await db.put('media', {
      ...media,
      isDeleted: false,
    });
  }

  public async getMedia(id: string): Promise<MediaPayload | null> {
    const db = await this.dbPromise;
    const record = await db.get('media', id);
    if (!record) return null;
    return {
      id: record.id,
      fullBlob: record.fullBlob,
      thumbBlob: record.thumbBlob,
      mimeType: record.mimeType,
      sha256: record.sha256,
      uploadedAt: record.uploadedAt,
    };
  }

  public async getThumbnail(id: string): Promise<Uint8Array | null> {
    const db = await this.dbPromise;
    const record = await db.get('media', id);
    return record ? record.thumbBlob : null;
  }

  public async listMetadata(): Promise<StoredMediaMetadata[]> {
    const db = await this.dbPromise;
    const tx = db.transaction('media', 'readonly');
    const records = await tx.store.getAll();
    return records.map((r) => ({
      id: r.id,
      sha256: r.sha256,
      uploadedAt: r.uploadedAt,
      isDeleted: r.isDeleted,
    }));
  }

  public async markDeleted(id: string, isDeleted: boolean): Promise<void> {
    const db = await this.dbPromise;
    const record = await db.get('media', id);
    if (!record) return;
    record.isDeleted = isDeleted;
    await db.put('media', record);
  }

  public async saveRoomSecret(roomId: string, secretKeyHex: string): Promise<void> {
    const db = await this.dbPromise;
    await db.put('rooms', { roomId, secretKeyHex });
  }

  public async getRoomSecret(roomId: string): Promise<string | null> {
    const db = await this.dbPromise;
    const record = await db.get('rooms', roomId);
    return record ? record.secretKeyHex : null;
  }

  public async clearRoom(_roomId: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['media', 'rooms', 'uploads'], 'readwrite');
    await Promise.all([
      tx.objectStore('media').clear(),
      tx.objectStore('rooms').clear(),
      tx.objectStore('uploads').clear(),
      tx.done,
    ]);
  }

  public async hasUploadedHash(roomId: string, sha256: string): Promise<boolean> {
    const db = await this.dbPromise;
    const key = `${roomId}:${sha256}`;
    const record = await db.get('uploads', key);
    return Boolean(record);
  }

  public async recordUploadedHash(roomId: string, sha256: string): Promise<void> {
    const db = await this.dbPromise;
    const key = `${roomId}:${sha256}`;
    await db.put('uploads', {
      key,
      roomId,
      sha256,
      timestamp: Date.now(),
    });
  }
}