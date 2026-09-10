import type {
  GalleryThumbnailItem,
  MediaPayload,
  RoomConfiguration,
  RoomInitResult,
  UploadProgressStage,
  UploadResult,
} from '../domain/models';

export interface IRoomHostService {
  initRoom(existingPrivateKeyHex?: string): Promise<RoomInitResult>;
  startSync(onNewMediaBadge: (newCount: number) => void): Promise<void>;
  stopSync(): Promise<void>;
  getNextSlideshowItem(): Promise<MediaPayload | null>;
  getGalleryThumbnails(): Promise<GalleryThumbnailItem[]>;
  getFullImage(id: string): Promise<MediaPayload | null>;
  deleteMedia(id: string): Promise<void>;
  exportAllAsZip(): Promise<Uint8Array>;
  purgeRoom(): Promise<void>;
}

export interface IImageUploaderService {
  uploadPhoto(
    roomId: string,
    recipientPublicKeyHex: string,
    rawFileBytes: Uint8Array,
    config: RoomConfiguration,
    onProgress: (stage: UploadProgressStage) => void
  ): Promise<UploadResult>;
}