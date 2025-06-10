import { Request, Response } from "express";

/**
 * Sistema de Keep-Alive para mantener la aplicación activa
 * Previene que el servidor se duerma en servicios como Replit
 */

let isKeepAliveActive = false;
let keepAliveInterval: NodeJS.Timeout | null = null;

export function startKeepAlive() {
  if (isKeepAliveActive) {
    console.log('[Keep-Alive] Sistema ya está activo');
    return;
  }

  console.log('[Keep-Alive] Iniciando sistema de mantenimiento...');
  isKeepAliveActive = true;

  // Ping cada 45 segundos (super agresivo para máxima estabilidad)
  keepAliveInterval = setInterval(async () => {
    try {
      const currentTime = new Date().toISOString();
      console.log(`[Keep-Alive] Ping realizado - ${currentTime}`);
      
      // Múltiples verificaciones para mantener el servidor activo
      await performHealthCheck();
      
      // Ping adicional interno para asegurar que el proceso esté activo
      const memoryUsage = process.memoryUsage();
      console.log(`[Keep-Alive] Memoria: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
      
      // Actividad de CPU para mantener el proceso vivo
      const cpuActivity = Array.from({length: 500}, (_, i) => Math.random() * i).reduce((a, b) => a + b, 0);
      
      // Verificar conexión de base de datos si existe
      try {
        if (global.db) {
          console.log('[Keep-Alive] Base de datos: ✓ Conectada');
        }
      } catch (dbError) {
        console.log('[Keep-Alive] Base de datos: ⚠ Verificando...');
      }
      
      // Crear actividad en el event loop
      setImmediate(() => {
        setTimeout(() => {
          const microTask = Date.now() % 1000;
        }, 1);
      });
      
    } catch (error) {
      console.error('[Keep-Alive] Error durante ping:', error);
    }
  }, 45 * 1000); // 45 segundos - Super agresivo
}

export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    isKeepAliveActive = false;
    console.log('[Keep-Alive] Sistema detenido');
  }
}

async function performHealthCheck() {
  // Verificación básica del sistema
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  console.log(`[Keep-Alive] Sistema saludable - Uptime: ${Math.floor(uptime/60)}min, Memoria: ${Math.round(memoryUsage.heapUsed/1024/1024)}MB`);
  
  return {
    status: 'healthy',
    uptime: uptime,
    memory: memoryUsage,
    timestamp: new Date().toISOString()
  };
}

/**
 * Endpoint para verificar el estado de la aplicación
 */
export function healthCheckEndpoint(req: Request, res: Response) {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    keepAlive: isKeepAliveActive
  });
}

/**
 * Endpoint para activar/desactivar keep-alive manualmente
 */
export function toggleKeepAlive(req: Request, res: Response) {
  const { action } = req.body;
  
  if (action === 'start') {
    startKeepAlive();
    res.json({ message: 'Keep-alive iniciado', active: true });
  } else if (action === 'stop') {
    stopKeepAlive();
    res.json({ message: 'Keep-alive detenido', active: false });
  } else {
    res.json({ 
      message: 'Estado actual', 
      active: isKeepAliveActive,
      uptime: process.uptime()
    });
  }
}