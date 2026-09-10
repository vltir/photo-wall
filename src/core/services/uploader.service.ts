import type {
  RoomConfiguration,
  UploadProgressStage,
  UploadResult,
} from '../domain/models';
import type { IImageUploaderService } from '../ports/input';
import type {
  IBlobStoreTransport,
  ICryptoProvider,
  IImageProcessor,
  ISignalingTransport,
  IStorageAdapter,
} from '../ports/output';
import { DeduplicationPolicy } from '../domain/deduplication';

export interface UploaderServiceDependencies {
  readonly imageProcessor: IImageProcessor;
  readonly cryptoProvider: ICryptoProvider;
  readonly blobStore: IBlobStoreTransport;
  readonly signaling: ISignalingTransport;
  readonly storage: IStorageAdapter;
  readonly blossomServerUrl: string;
  readonly relayUrls: string[]; // <-- Neu: Relays für das Senden
}

export class ImageUploaderService implements IImageUploaderService {
  private readonly deduplication: DeduplicationPolicy;
  private relaysConnected = false;

  constructor(private readonly deps: UploaderServiceDependencies) {
    this.deduplication = new DeduplicationPolicy(deps.storage);
  }

  public async uploadPhoto(
    roomId: string,
    recipientPublicKeyHex: string,
    rawFileBytes: Uint8Array,
    config: RoomConfiguration,
    onProgress: (stage: UploadProgressStage) => void
  ): Promise<UploadResult> {
    // 1. Sanitize & Compress
    onProgress('compressing');
    const sanitizedWebP = await this.deps.imageProcessor.compressAndStripExif(
      rawFileBytes,
      config.targetResolution,
      config.webpQuality
    );

    // 2. Local Deduplication
    const imageHash = await this.deps.cryptoProvider.computeSha256(sanitizedWebP);
    const isDuplicate = await this.deduplication.isDuplicate(roomId, imageHash);
    if (isDuplicate) {
      throw new Error(`Duplicate image detected (SHA-256: ${imageHash}). Upload aborted.`);
    }

    // 3. Symmetric Encryption (AES-256-GCM)
    onProgress('encrypting');
    const symmetricKey = await this.deps.cryptoProvider.generateSymmetricKey();
    const keyHex = await this.deps.cryptoProvider.exportKeyHex(symmetricKey);
    const { ciphertext, iv } = await this.deps.cryptoProvider.encryptBytes(
      sanitizedWebP,
      symmetricKey
    );

    const ivHex = Array.from(iv)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // 4. Binary Upload to Blossom
    onProgress('uploading');
    const blobUrl = await this.deps.blobStore.uploadBlob(
      this.deps.blossomServerUrl,
      ciphertext
    );

    // 5. Send Nostr Signal
    onProgress('signaling');

    // Sicherstellen, dass die Relay-Verbindung steht
    if (!this.relaysConnected) {
      await this.deps.signaling.connect(this.deps.relayUrls);
      this.relaysConnected = true;
    }

    await this.deps.signaling.publish(recipientPublicKeyHex, {
      blobUrl,
      encryptionKeyHex: keyHex,
      ivHex,
      uploadedAt: Math.floor(Date.now() / 1000),
    });

    // 6. Record local hash
    await this.deduplication.markProcessed(roomId, imageHash);

    return {
      success: true,
      sha256: imageHash,
    };
  }
}