
import sharp from 'sharp';
import { encode } from 'blurhash';
import { logger } from '../lib/logger';

export class MediaService {
  /**
   * Processes a base64 image:
   * 1. Converts to WebP (optimized)
   * 2. Generates a 200px thumbnail (WebP)
   * 3. Generates a BlurHash
   */
  async processImage(base64Data: string): Promise<{
    optimized: string;
    thumbnail: string;
    blurhash: string;
  }> {
    try {
      // Remove data:image/xxx;base64, prefix
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
      }

      const buffer = Buffer.from(matches[2], 'base64');
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // 1. Optimized Original (WebP, max 1200px, quality 80)
      const optimizedBuffer = await image
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      
      // 2. Thumbnail (WebP, max 200px, quality 60)
      const thumbnailBuffer = await image
        .resize({ width: 200, height: 200, fit: 'cover' })
        .webp({ quality: 60 })
        .toBuffer();

      // 3. BlurHash (using a small 32x32 raw buffer)
      const { data, info } = await image
        .raw()
        .ensureAlpha()
        .resize(32, 32, { fit: 'inside' })
        .toBuffer({ resolveWithObject: true });
      
      const blurHash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);

      return {
        optimized: `data:image/webp;base64,${optimizedBuffer.toString('base64')}`,
        thumbnail: `data:image/webp;base64,${thumbnailBuffer.toString('base64')}`,
        blurhash: blurHash,
      };
    } catch (error) {
      logger.error('Error processing image in MediaService:', error);
      // Fallback: return original as both if processing fails, empty blurhash
      return {
        optimized: base64Data,
        thumbnail: base64Data,
        blurhash: '',
      };
    }
  }
}

export const mediaService = new MediaService();
