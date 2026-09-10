export interface KeyPair {
  readonly publicKeyHex: string;
  readonly privateKeyHex: string;
}

export interface MediaDimensions {
  readonly width: number;
  readonly height: number;
}

export interface RoomConfiguration {
  readonly targetResolution: MediaDimensions;
  readonly webpQuality: number;
}

export interface MediaPayload {
  readonly id: string;
  readonly fullBlob: Uint8Array;
  readonly thumbBlob: Uint8Array;
  readonly mimeType: string;
  readonly sha256: string;
  readonly uploadedAt: number;
}

export interface StoredMediaMetadata {
  readonly id: string;
  readonly sha256: string;
  readonly uploadedAt: number;
  readonly isDeleted: boolean;
}

export interface GalleryThumbnailItem extends StoredMediaMetadata {
  readonly thumbBlob: Uint8Array;
}

export interface SignalingPayload {
  readonly blobUrl: string;
  readonly encryptionKeyHex: string;
  readonly ivHex: string;
  readonly uploadedAt: number;
}

export type UploadProgressStage =
  | 'compressing'
  | 'encrypting'
  | 'uploading'
  | 'signaling';

export interface UploadResult {
  readonly success: boolean;
  readonly sha256: string;
}

export interface RoomInitResult {
  readonly roomId: string;
  readonly publicKeyHex: string;
  readonly privateKeyHex: string;
}

export interface ArchiveFileEntry {
  readonly filename: string;
  readonly data: Uint8Array;
}

export interface EncryptedPayload {
  readonly ciphertext: Uint8Array;
  readonly iv: Uint8Array;
}