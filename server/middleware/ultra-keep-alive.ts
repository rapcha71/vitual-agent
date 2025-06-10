/**
 * Sistema Ultra Keep-Alive - Solución robusta contra desconexiones
 * Múltiples estrategias para mantener la aplicación siempre activa
 */

import { Request, Response } from "express";

let ultraKeepAliveActive = false;
let heartbeatInterval: NodeJS.Timeout | null = null;
let connectionCheckInterval: NodeJS.Timeout | null = null;

export function startUltraKeepAlive() {
  if (ultraKeepAliveActive) {
    console.log('[Ultra-KeepAlive] ✅ Sistema ya está activo');
    return;
  }

  console.log('[Ultra-KeepAlive] 🚀 Iniciando sistema ultra-robusto...');
  ultraKeepAliveActive = true;

  // Estrategia 1: Heartbeat cada 15 segundos (ultra agresivo)
  heartbeatInterval = setInterval(() => {
    const timestamp = new Date().toLocaleString('es-CR');
    console.log(`[Ultra-KeepAlive] 💓 Heartbeat - ${timestamp}`);
    
    // Simular actividad del servidor
    const dummyProcess = {
      timestamp: Date.now(),
      memory: process.memoryUsage().heapUsed,
      uptime: process.uptime(),
      status: 'active'
    };
    
    // Log de actividad para mantener el proceso vivo
    process.stdout.write(`\r[Ultra-KeepAlive] ⚡ Activo: ${Math.floor(dummyProcess.uptime)}s`);
    
    // Actividad adicional para evitar hibernación
    global.gc && global.gc();
    
    // Operaciones matemáticas para mantener CPU activa
    for (let i = 0; i < 1000; i++) {
      Math.random() * Math.PI;
    }
    
  }, 15 * 1000); // 15 segundos

  // Estrategia 2: Verificación de conexión cada 20 segundos (super agresivo)
  connectionCheckInterval = setInterval(async () => {
    try {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        pid: process.pid,
        status: 'healthy'
      };
      
      console.log(`[Ultra-KeepAlive] 🔍 Check: ${healthStatus.memory}MB, PID:${healthStatus.pid}`);
      
      // Generar actividad adicional del CPU para mantener vivo el proceso
      const dummy = Array.from({length: 1000}, (_, i) => i * Math.random()).reduce((a, b) => a + b, 0);
      
      // Mantener el event loop activo
      setImmediate(() => {
        // Operación asíncrona para mantener el servidor responsivo
        Promise.resolve().then(() => {
          // Dummy operation para mantener actividad
        });
      });
      
    } catch (error) {
      console.error('[Ultra-KeepAlive] ❌ Error en verificación:', error);
    }
  }, 20 * 1000); // 20 segundos

  // Estrategia 3: Auto-ping interno cada 15 segundos (extremo)
  setInterval(() => {
    const selfPing = {
      timestamp: Date.now(),
      type: 'self-ping',
      status: 'ok'
    };
    console.log(`[Ultra-KeepAlive] 🏓 Self-ping realizado`);
    
    // Crear micro-actividad constante
    setTimeout(() => {
      const microActivity = Date.now() % 1000;
    }, 1);
    
  }, 15 * 1000); // 15 segundos

  // Estrategia 4: Auto-ping HTTP externo cada 25 segundos
  setInterval(async () => {
    try {
      const url = process.env.REPL_SLUG ? 
        `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/health` : 
        'http://localhost:5000/api/health';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Ultra-KeepAlive-System' }
      });
      
      if (response.ok) {
        console.log(`[Ultra-KeepAlive] 🌐 Ping externo exitoso: ${response.status}`);
      }
    } catch (error) {
      console.log(`[Ultra-KeepAlive] ⚠️ Ping externo falló (normal en desarrollo)`);
    }
  }, 25 * 1000); // 25 segundos

  // Estrategia 5: Proceso dummy cada 10 segundos para máxima actividad
  setInterval(() => {
    const dummyData = {
      timestamp: Date.now(),
      random: Math.random(),
      counter: Math.floor(Date.now() / 1000) % 1000
    };
    
    // Operación matemática para mantener CPU activo
    const calculation = Array.from({length: 100}, (_, i) => 
      Math.sin(i) * Math.cos(dummyData.random)
    ).reduce((sum, val) => sum + val, 0);
    
    console.log(`[Ultra-KeepAlive] ⚡ Proceso activo: ${dummyData.counter}`);
  }, 10 * 1000); // 10 segundos

  console.log('[Ultra-KeepAlive] ✅ Todas las estrategias activadas (MODO EXTREMO)');
  console.log('[Ultra-KeepAlive] - Heartbeat: cada 30 segundos');
  console.log('[Ultra-KeepAlive] - Connection check: cada 20 segundos');
  console.log('[Ultra-KeepAlive] - Self-ping: cada 15 segundos');
  console.log('[Ultra-KeepAlive] - HTTP ping: cada 25 segundos');
  console.log('[Ultra-KeepAlive] - Proceso activo: cada 10 segundos');
}

export function stopUltraKeepAlive() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
  
  ultraKeepAliveActive = false;
  console.log('[Ultra-KeepAlive] 🛑 Sistema detenido');
}

export function getUltraKeepAliveStatus(): object {
  return {
    active: ultraKeepAliveActive,
    heartbeat: heartbeatInterval !== null,
    connectionCheck: connectionCheckInterval !== null,
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    timestamp: new Date().toISOString()
  };
}

// Endpoint para verificar estado ultra keep-alive
export function ultraKeepAliveStatus(req: Request, res: Response) {
  const status = getUltraKeepAliveStatus();
  res.json({
    status: 'ok',
    ultraKeepAlive: status,
    message: 'Sistema ultra keep-alive funcionando'
  });
}