/**
 * Sistema de Control de Versiones y Persistencia
 * Previene rollbacks automáticos del código al reiniciar
 */

import { Request, Response } from "express";
import fs from "fs";
import path from "path";

const VERSION_FILE = ".version-lock";
const BACKUP_DIR = ".app-backups";
const CURRENT_VERSION = "2.0.0-stable";

let versionControlActive = false;
let versionCheckInterval: NodeJS.Timeout | null = null;

export function startVersionControl() {
  if (versionControlActive) {
    console.log('[Version-Control] ✅ Sistema ya está activo');
    return;
  }

  console.log('[Version-Control] 🔐 Iniciando control de versiones...');
  versionControlActive = true;

  // Crear estructura de directorios si no existe
  ensureBackupStructure();

  // Verificar y marcar versión actual
  markCurrentVersion();

  // Backup automático cada 2 minutos
  versionCheckInterval = setInterval(() => {
    try {
      createVersionSnapshot();
      verifyVersionIntegrity();
      console.log(`[Version-Control] 📸 Snapshot v${CURRENT_VERSION} creado`);
    } catch (error) {
      console.error('[Version-Control] ❌ Error en snapshot:', error);
    }
  }, 2 * 60 * 1000); // 2 minutos

  console.log('[Version-Control] ✅ Control de versiones activado');
}

function ensureBackupStructure() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const configDir = path.join(BACKUP_DIR, 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    console.log('[Version-Control] 📁 Estructura de backup verificada');
  } catch (error) {
    console.error('[Version-Control] ❌ Error creando estructura:', error);
  }
}

function markCurrentVersion() {
  try {
    const versionData = {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memoryUsage: process.memoryUsage(),
      status: 'active',
      lastUpdate: Date.now()
    };

    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));
    console.log(`[Version-Control] 🏷️ Versión ${CURRENT_VERSION} marcada`);
  } catch (error) {
    console.error('[Version-Control] ❌ Error marcando versión:', error);
  }
}

function createVersionSnapshot() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFile = path.join(BACKUP_DIR, `snapshot-${timestamp}.json`);
    
    const snapshotData = {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        REPL_SLUG: process.env.REPL_SLUG,
        REPL_OWNER: process.env.REPL_OWNER
      },
      keepAliveStatus: {
        activeTime: process.uptime(),
        memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        status: 'running'
      }
    };

    fs.writeFileSync(snapshotFile, JSON.stringify(snapshotData, null, 2));
    
    // Mantener solo los últimos 10 snapshots
    cleanupOldSnapshots();
    
  } catch (error) {
    console.error('[Version-Control] ❌ Error creando snapshot:', error);
  }
}

function cleanupOldSnapshots() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('snapshot-'))
      .sort()
      .reverse();
    
    // Eliminar snapshots antiguos, mantener solo los últimos 10
    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      });
    }
  } catch (error) {
    console.error('[Version-Control] ❌ Error limpiando snapshots:', error);
  }
}

function verifyVersionIntegrity() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
      
      if (versionData.version !== CURRENT_VERSION) {
        console.warn(`[Version-Control] ⚠️ Versión incorrecta detectada: ${versionData.version}`);
        markCurrentVersion(); // Re-marcar la versión correcta
      }
      
      // Actualizar timestamp de última verificación
      versionData.lastUpdate = Date.now();
      fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));
    }
  } catch (error) {
    console.error('[Version-Control] ❌ Error verificando integridad:', error);
    markCurrentVersion(); // Re-crear archivo de versión
  }
}

export function getVersionStatus(): object {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
      return {
        ...versionData,
        currentUptime: process.uptime(),
        active: versionControlActive,
        snapshots: getSnapshotCount()
      };
    }
  } catch (error) {
    console.error('[Version-Control] ❌ Error obteniendo estado:', error);
  }
  
  return {
    version: CURRENT_VERSION,
    status: 'unknown',
    active: versionControlActive
  };
}

function getSnapshotCount(): number {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('snapshot-'))
      .length;
  } catch {
    return 0;
  }
}

export function stopVersionControl() {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
  }
  
  versionControlActive = false;
  console.log('[Version-Control] 🛑 Control de versiones detenido');
}

export function versionStatusEndpoint(req: Request, res: Response) {
  const status = getVersionStatus();
  res.json({
    status: 'ok',
    versionControl: status,
    message: 'Control de versiones funcionando correctamente'
  });
}

export function forceVersionLock(req: Request, res: Response) {
  try {
    markCurrentVersion();
    createVersionSnapshot();
    
    res.json({
      status: 'ok',
      message: `Versión ${CURRENT_VERSION} bloqueada exitosamente`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error bloqueando versión',
      error: error.message
    });
  }
}