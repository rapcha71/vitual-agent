
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = 'd:/OneDrive/Desktop/EScritorio/vitual-agent/client/public/assets/ciudad.jpeg';
const output = 'd:/OneDrive/Desktop/EScritorio/vitual-agent/client/public/assets/ciudad-optimized.webp';

async function optimize() {
  try {
    const info = await sharp(input)
      .webp({ quality: 60 })
      .toFile(output);
    
    console.log('Optimized background image:', info);
    const oldSize = fs.statSync(input).size;
    const newSize = fs.statSync(output).size;
    console.log(`Size reduced from ${(oldSize / 1024 / 1024).toFixed(2)}MB to ${(newSize / 1024 / 1024).toFixed(2)}MB`);
  } catch (error) {
    console.error('Error optimizing image:', error);
  }
}

optimize();
