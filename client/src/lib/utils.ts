import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import imageCompression from 'browser-image-compression';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function compressImageForThumbnail(imageUrl: string): Promise<string> {
  try {
    // Fetch the image and convert it to a blob
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Compression options for thumbnails
    const options = {
      maxSizeMB: 0.1, // Very small file size for thumbnails
      maxWidthOrHeight: 400, // Reasonable size for preview
      useWebWorker: true
    };

    // Compress the image
    const compressedBlob = await imageCompression(blob, options);

    // Convert back to base64/URL
    return URL.createObjectURL(compressedBlob);
  } catch (error) {
    console.error('Error compressing image:', error);
    return imageUrl; // Return original URL if compression fails
  }
}