/**
 * Sistema de Limpieza de Versiones
 * Elimina automáticamente versiones anteriores para prevenir rollbacks
 */

import { Request, Response } from "express";
import fs from "fs";
import path from "path";

const CURRENT_VERSION = "2.0.0-stable";
const PROTECTED_FILES = [
  ".app-config.json",
  ".version-lock",
  "package.json",
  "package-lock.json",
  ".env",
  "drizzle.config.ts",
  "tsconfig.json",
  "vite.config.ts",
  "tailwind.config.ts",
  "postcss.config.js",
  ".replit",
  "replit.nix"
];

let cleanerActive = false;
let cleanupInterval: NodeJS.Timeout | null = null;

export function startVersionCleaner() {
  if (cleanerActive) {
    console.log('[Version-Cleaner] ✅ Sistema ya está activo');
    return;
  }

  console.log('[Version-Cleaner] 🧹 Iniciando limpieza automática...');
  cleanerActive = true;

  // Limpieza inicial
  performInitialCleanup();

  // Limpieza periódica cada 5 minutos
  cleanupInterval = setInterval(() => {
    try {
      performMaintenanceCleanup();
      markStableVersion();
      console.log('[Version-Cleaner] 🧹 Limpieza de mantenimiento completada');
    } catch (error) {
      console.error('[Version-Cleaner] ❌ Error en limpieza:', error);
    }
  }, 5 * 60 * 1000); // 5 minutos

  console.log('[Version-Cleaner] ✅ Limpieza automática activada');
}

function performInitialCleanup() {
  try {
    // Eliminar archivos temporales y de desarrollo
    cleanTempFiles();
    
    // Eliminar logs antiguos
    cleanOldLogs();
    
    // Limpiar caché de node_modules si existe
    cleanNodeModulesCache();
    
    // Marcar versión estable actual
    markStableVersion();
    
    console.log('[Version-Cleaner] 🚀 Limpieza inicial completada');
  } catch (error) {
    console.error('[Version-Cleaner] ❌ Error en limpieza inicial:', error);
  }
}

function cleanTempFiles() {
  const tempPatterns = [
    '*.tmp',
    '*.temp',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    '*.bak',
    '*.backup',
    '*~',
    '.vscode/.ropeproject',
    '__pycache__',
    '*.pyc',
    '*.pyo'
  ];

  tempPatterns.forEach(pattern => {
    try {
      // Solo eliminar archivos temporales, no directorios importantes
      const files = findFilesByPattern(process.cwd(), pattern);
      files.forEach(file => {
        if (fs.existsSync(file) && !isProtectedPath(file)) {
          fs.unlinkSync(file);
          console.log(`[Version-Cleaner] 🗑️ Eliminado: ${path.basename(file)}`);
        }
      });
    } catch (error) {
      // Ignorar errores de archivos que no se pueden eliminar
    }
  });
}

function cleanOldLogs() {
  const logDirs = ['logs', '.logs', 'tmp', '.tmp'];
  
  logDirs.forEach(logDir => {
    if (fs.existsSync(logDir)) {
      try {
        const files = fs.readdirSync(logDir);
        files.forEach(file => {
          const filePath = path.join(logDir, file);
          const stats = fs.statSync(filePath);
          
          // Eliminar archivos de log más antiguos de 24 horas
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          if (stats.mtime.getTime() < oneDayAgo) {
            fs.unlinkSync(filePath);
            console.log(`[Version-Cleaner] 📝 Log eliminado: ${file}`);
          }
        });
      } catch (error) {
        // Ignorar errores de acceso a directorios
      }
    }
  });
}

function cleanNodeModulesCache() {
  const cachePaths = [
    'node_modules/.cache',
    '.npm',
    '.yarn-cache',
    '.pnpm-store'
  ];

  cachePaths.forEach(cachePath => {
    if (fs.existsSync(cachePath)) {
      try {
        // Solo limpiar archivos de caché, no eliminar node_modules completo
        const files = fs.readdirSync(cachePath);
        let cleanedFiles = 0;
        
        files.forEach(file => {
          const filePath = path.join(cachePath, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            cleanedFiles++;
          }
        });
        
        if (cleanedFiles > 0) {
          console.log(`[Version-Cleaner] 💾 Cache limpiado: ${cleanedFiles} archivos`);
        }
      } catch (error) {
        // Ignorar errores de caché
      }
    }
  });
}

function performMaintenanceCleanup() {
  // Limpiar solo archivos temporales nuevos
  cleanTempFiles();
  
  // Verificar y mantener solo snapshots recientes
  cleanOldSnapshots();
  
  // Actualizar marca de tiempo de versión estable
  updateVersionTimestamp();
}

function cleanOldSnapshots() {
  const backupDir = '.app-backups';
  
  if (fs.existsSync(backupDir)) {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('snapshot-'))
        .sort()
        .reverse();
      
      // Mantener solo los últimos 5 snapshots
      if (files.length > 5) {
        const filesToDelete = files.slice(5);
        filesToDelete.forEach(file => {
          fs.unlinkSync(path.join(backupDir, file));
        });
        console.log(`[Version-Cleaner] 📸 Snapshots antiguos eliminados: ${filesToDelete.length}`);
      }
    } catch (error) {
      // Ignorar errores de snapshots
    }
  }
}

function markStableVersion() {
  const versionData = {
    version: CURRENT_VERSION,
    stable: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
    lastCleanup: Date.now(),
    protected: true,
    locked: true
  };

  try {
    fs.writeFileSync('.version-lock', JSON.stringify(versionData, null, 2));
    
    // También actualizar config de la app
    if (fs.existsSync('.app-config.json')) {
      const config = JSON.parse(fs.readFileSync('.app-config.json', 'utf8'));
      config.lastUpdate = new Date().toISOString();
      config.version = CURRENT_VERSION;
      config.locked = true;
      fs.writeFileSync('.app-config.json', JSON.stringify(config, null, 2));
    }
    
    console.log(`[Version-Cleaner] 🔒 Versión ${CURRENT_VERSION} bloqueada como estable`);
  } catch (error) {
    console.error('[Version-Cleaner] ❌ Error marcando versión estable:', error);
  }
}

function updateVersionTimestamp() {
  try {
    if (fs.existsSync('.version-lock')) {
      const versionData = JSON.parse(fs.readFileSync('.version-lock', 'utf8'));
      versionData.lastUpdate = Date.now();
      versionData.uptime = process.uptime();
      fs.writeFileSync('.version-lock', JSON.stringify(versionData, null, 2));
    }
  } catch (error) {
    // Re-crear archivo si hay error
    markStableVersion();
  }
}

function findFilesByPattern(dir: string, pattern: string): string[] {
  const files: string[] = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      
      if (fs.statSync(fullPath).isFile()) {
        if (item.match(pattern.replace('*', '.*'))) {
          files.push(fullPath);
        }
      }
    });
  } catch (error) {
    // Ignorar errores de acceso a directorios
  }
  
  return files;
}

function isProtectedPath(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // Proteger archivos específicos
  if (PROTECTED_FILES.includes(fileName)) {
    return true;
  }
  
  // Proteger directorios importantes
  const protectedDirs = ['node_modules', '.git', 'client', 'server', 'shared'];
  if (protectedDirs.some(dir => dirName.includes(dir))) {
    return true;
  }
  
  return false;
}

export function stopVersionCleaner() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  
  cleanerActive = false;
  console.log('[Version-Cleaner] 🛑 Limpieza automática detenida');
}

export function forceCleanup(req: Request, res: Response) {
  try {
    performInitialCleanup();
    markStableVersion();
    
    res.json({
      status: 'ok',
      message: 'Limpieza forzada completada exitosamente',
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Error en limpieza forzada',
      error: error.message
    });
  }
}

export function getCleanupStatus(): object {
  return {
    active: cleanerActive,
    version: CURRENT_VERSION,
    uptime: process.uptime(),
    lastCleanup: fs.existsSync('.version-lock') ? 
      JSON.parse(fs.readFileSync('.version-lock', 'utf8')).lastCleanup : null,
    protected: true,
    locked: true
  };
}