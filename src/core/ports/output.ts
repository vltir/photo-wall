import type {
  ArchiveFileEntry,
  EncryptedPayload,
  KeyPair,
  MediaDimensions,
  MediaPayload,
  SignalingPayload,
  StoredMediaMetadata,
} from '../domain/models';

export interface IStorageAdapter {
  saveMedia(media: MediaPayload): Promise<void>;
  getMedia(id: string): Promise<MediaPayload | null>;
  getThumbnail(id: string): Promise<Uint8Array | null>;
  listMetadata(): Promise<StoredMediaMetadata[]>;
  markDeleted(id: string, isDeleted: boolean): Promise<void>;
  saveRoomSecret(roomId: string, secretKeyHex: string): Promise<void>;
  getRoomSecret(roomId: string): Promise<string | null>;
  clearRoom(roomId: string): Promise<void>;
  hasUploadedHash(roomId: string, sha256: string): Promise<boolean>;
  recordUploadedHash(roomId: string, sha256: string): Promise<void>;
}

export interface ISignalingTransport {
  connect(relayUrls: string[]): Promise<void>;
  subscribe(
    recipientPublicKeyHex: string,
    sinceTimestamp: number,
    onSignal: (signal: SignalingPayload) => void
  ): Promise<() => void>;
  publish(
    recipientPublicKeyHex: string,
    payload: SignalingPayload
  ): Promise<void>;
  disconnect(): Promise<void>;
}

export interface IBlobStoreTransport {
  uploadBlob(
    serverUrl: string,
    encryptedBytes: Uint8Array,
    authSigner?: (hash: string) => Promise<string>
  ): Promise<string>;
  downloadBlob(url: string): Promise<Uint8Array>;
}

export interface ICryptoProvider {
  generateAsymmetricKeyPair(): KeyPair;
  generateSymmetricKey(): Promise<CryptoKey>;
  exportKeyHex(key: CryptoKey): Promise<string>;
  importKeyHex(hex: string): Promise<CryptoKey>;
  encryptBytes(data: Uint8Array, key: CryptoKey): Promise<EncryptedPayload>;
  decryptBytes(
    ciphertext: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<Uint8Array>;
  computeSha256(data: Uint8Array): Promise<string>;
}

export interface IImageProcessor {
  compressAndStripExif(
    rawBuffer: Uint8Array,
    maxDimensions: MediaDimensions,
    quality: number
  ): Promise<Uint8Array>;
  generateThumbnail(
    fullImageBytes: Uint8Array,
    maxDimension: number
  ): Promise<Uint8Array>;
}

export interface IArchivePacker {
  packZip(files: ArchiveFileEntry[]): Promise<Uint8Array>;
}