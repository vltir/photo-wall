import type { IStorageAdapter } from '../ports/output';

export class DeduplicationPolicy {
  constructor(private readonly storage: IStorageAdapter) {}

  public async isDuplicate(roomId: string, sha256Hex: string): Promise<boolean> {
    if (!roomId || !sha256Hex) {
      throw new Error('Room ID and SHA-256 hash must be valid non-empty strings.');
    }
    return this.storage.hasUploadedHash(roomId, sha256Hex.toLowerCase());
  }

  public async markProcessed(roomId: string, sha256Hex: string): Promise<void> {
    await this.storage.recordUploadedHash(roomId, sha256Hex.toLowerCase());
  }
}