#!/usr/bin/env node

/**
 * Script de build optimizado específicamente para Docker/Google Cloud
 * Construye solo lo esencial para producción
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (message) => console.log(`[Docker-Build] ${message}`);

try {
  log('Iniciando build para Docker...');

  // Limpiar directorios existentes
  if (fs.existsSync('dist')) {
    execSync('rm -rf dist');
  }

  // 1. Construir backend optimizado
  log('Construyendo backend...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=node20 --minify --sourcemap=false', { 
    stdio: 'inherit' 
  });

  // 2. Crear estructura de directorios
  const publicDir = 'dist/public';
  fs.mkdirSync(publicDir, { recursive: true });

  // 3. Build del frontend con configuración mínima
  log('Construyendo frontend (optimizado)...');
  
  // Crear un vite.config.minimal.js para build más rápido
  const minimalConfig = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  }
});
`;

  fs.writeFileSync('vite.config.minimal.js', minimalConfig);
  
  // Build con configuración mínima
  process.env.NODE_ENV = 'production';
  execSync('npx vite build --config vite.config.minimal.js', { 
    stdio: 'inherit',
    timeout: 300000 // 5 minutos timeout
  });

  // Limpiar archivo temporal
  fs.unlinkSync('vite.config.minimal.js');

  // 4. Verificar archivos críticos
  const indexPath = path.join(publicDir, 'index.html');
  const serverPath = 'dist/index.js';

  if (!fs.existsSync(indexPath)) {
    throw new Error(`Frontend build failed: ${indexPath} not found`);
  }

  if (!fs.existsSync(serverPath)) {
    throw new Error(`Backend build failed: ${serverPath} not found`);
  }

  // 5. Mostrar estadísticas
  const stats = fs.statSync(serverPath);
  const indexStats = fs.statSync(indexPath);
  
  log('✅ Build para Docker completado');
  log(`   Backend: ${serverPath} (${Math.round(stats.size/1024)}KB)`);
  log(`   Frontend: ${indexPath} (${Math.round(indexStats.size/1024)}KB)`);
  log(`   Archivos estáticos: ${publicDir}`);

} catch (err) {
  console.error(`[Error] Docker build falló: ${err.message}`);
  process.exit(1);
}
