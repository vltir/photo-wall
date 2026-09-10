import type { IImageProcessor } from '@core/ports/output';
import type { MediaDimensions } from '@core/domain/models';

export class CanvasImageProcessor implements IImageProcessor {
  public async compressAndStripExif(
    rawBuffer: Uint8Array,
    maxDimensions: MediaDimensions,
    quality: number
  ): Promise<Uint8Array> {
    const blob = new Blob([rawBuffer.buffer as ArrayBuffer]);
    const imageBitmap = await createImageBitmap(blob);

    try {
      const { width: targetWidth, height: targetHeight } = this.calculateFitDimensions(
        imageBitmap.width,
        imageBitmap.height,
        maxDimensions.width,
        maxDimensions.height
      );

      return await this.renderToWebP(imageBitmap, targetWidth, targetHeight, quality);
    } finally {
      imageBitmap.close();
    }
  }

  public async generateThumbnail(
    fullImageBytes: Uint8Array,
    maxDimension: number
  ): Promise<Uint8Array> {
    const blob = new Blob([fullImageBytes.buffer as ArrayBuffer]);
    const imageBitmap = await createImageBitmap(blob);

    try {
      const { width: targetWidth, height: targetHeight } = this.calculateFitDimensions(
        imageBitmap.width,
        imageBitmap.height,
        maxDimension,
        maxDimension
      );

      return await this.renderToWebP(imageBitmap, targetWidth, targetHeight, 0.75);
    } finally {
      imageBitmap.close();
    }
  }

  private calculateFitDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = srcWidth;
    let height = srcHeight;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    return { width, height };
  }

  private async renderToWebP(
    bitmap: ImageBitmap,
    width: number,
    height: number,
    quality: number
  ): Promise<Uint8Array> {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not acquire OffscreenCanvas 2D context.');

      ctx.drawImage(bitmap, 0, 0, width, height);
      const resultBlob = await canvas.convertToBlob({
        type: 'image/webp',
        quality,
      });
      const arrayBuffer = await resultBlob.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not acquire Canvas 2D context.');

    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise<Uint8Array>((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Canvas image/webp encoding failed.'));
            return;
          }
          const buffer = await blob.arrayBuffer();
          resolve(new Uint8Array(buffer));
        },
        'image/webp',
        quality
      );
    });
  }
}