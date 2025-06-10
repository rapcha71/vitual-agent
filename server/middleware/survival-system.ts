/**
 * Sistema de Supervivencia - Protección máxima contra caídas del servidor
 * Sistema de quinta generación con redundancia total
 */

import { Request, Response } from "express";

let survivalActive = false;
let criticalInterval: NodeJS.Timeout | null = null;
let emergencyInterval: NodeJS.Timeout | null = null;
let recoveryInterval: NodeJS.Timeout | null = null;
let memoryGuardInterval: NodeJS.Timeout | null = null;
let connectionForceInterval: NodeJS.Timeout | null = null;

export function startSurvivalSystem() {
  if (survivalActive) {
    console.log('[Survival-System] ✅ Sistema ya está activo');
    return;
  }

  console.log('[Survival-System] 🛡️ Activando protección máxima...');
  survivalActive = true;

  // Nivel 1: Actividad crítica cada 3 segundos
  criticalInterval = setInterval(() => {
    const now = Date.now();
    process.stdout.write(`\r[Survival] 🚨 CRÍTICO: ${now % 10000}`);
    
    // Operaciones intensivas para mantener vivo
    const array = new Array(1000).fill(0).map(() => Math.random());
    array.sort();
    
    // Forzar uso de memoria
    const buffer = Buffer.alloc(1024, 'survival-mode');
    buffer.toString('hex');
    
  }, 3 * 1000); // 3 segundos

  // Nivel 2: Emergencia cada 5 segundos
  emergencyInterval = setInterval(() => {
    console.log(`[Survival-System] 🆘 EMERGENCIA - PID:${process.pid} - Uptime:${Math.floor(process.uptime())}s`);
    
    // Actividad de red simulada
    const headers = {
      'User-Agent': 'Survival-System/1.0',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    };
    
    // Operaciones de E/O para mantener activo
    process.nextTick(() => {
      setImmediate(() => {
        setTimeout(() => {
          console.log('[Survival-System] ⚡ Tick completado');
        }, 1);
      });
    });
    
  }, 5 * 1000); // 5 segundos

  // Nivel 3: Recovery cada 7 segundos
  recoveryInterval = setInterval(() => {
    const memory = process.memoryUsage();
    console.log(`[Survival-System] 🔄 RECOVERY - Heap:${Math.round(memory.heapUsed/1024/1024)}MB`);
    
    // Simular múltiples operaciones concurrentes
    Promise.all([
      Promise.resolve(Math.random()),
      Promise.resolve(Date.now()),
      Promise.resolve(process.uptime())
    ]).then(() => {
      console.log('[Survival-System] ✅ Recovery cycle complete');
    });
    
    // Mantener referencias activas
    global.survivalData = {
      timestamp: Date.now(),
      pid: process.pid,
      memory: memory.heapUsed,
      active: true
    };
    
  }, 7 * 1000); // 7 segundos

  // Nivel 4: Memory Guard cada 10 segundos
  memoryGuardInterval = setInterval(() => {
    const mem = process.memoryUsage();
    console.log(`[Survival-System] 🧠 MEMORY-GUARD - RSS:${Math.round(mem.rss/1024/1024)}MB External:${Math.round(mem.external/1024/1024)}MB`);
    
    // Crear y destruir objetos para mantener GC activo
    const tempObjects = [];
    for (let i = 0; i < 100; i++) {
      tempObjects.push({
        id: i,
        timestamp: Date.now(),
        data: new Array(10).fill(Math.random())
      });
    }
    tempObjects.length = 0; // Limpiar para GC
    
    // Forzar garbage collection si está disponible
    if (global.gc) {
      try {
        global.gc();
        console.log('[Survival-System] 🗑️ GC forzado');
      } catch (e) {
        // Silenciar errores de GC
      }
    }
    
  }, 10 * 1000); // 10 segundos

  // Nivel 5: Connection Force cada 8 segundos
  connectionForceInterval = setInterval(() => {
    console.log('[Survival-System] 🔗 CONNECTION-FORCE activo');
    
    // Simular actividad de red intensa
    const connections = [];
    for (let i = 0; i < 5; i++) {
      connections.push({
        id: i,
        timestamp: Date.now(),
        status: 'active',
        keepAlive: true
      });
    }
    
    // Operaciones CPU intensivas
    let result = 0;
    for (let i = 0; i < 10000; i++) {
      result += Math.sin(i) * Math.cos(i);
    }
    
    console.log(`[Survival-System] 💪 Cálculo intensivo completado: ${result.toFixed(2)}`);
    
  }, 8 * 1000); // 8 segundos

  console.log('[Survival-System] 🚀 TODOS LOS NIVELES ACTIVADOS');
  console.log('[Survival-System] - Nivel 1: Crítico cada 3s');
  console.log('[Survival-System] - Nivel 2: Emergencia cada 5s');
  console.log('[Survival-System] - Nivel 3: Recovery cada 7s');
  console.log('[Survival-System] - Nivel 4: Memory Guard cada 10s');
  console.log('[Survival-System] - Nivel 5: Connection Force cada 8s');
}

export function stopSurvivalSystem() {
  if (!survivalActive) return;

  console.log('[Survival-System] 🛑 Deteniendo sistema de supervivencia...');
  survivalActive = false;

  if (criticalInterval) {
    clearInterval(criticalInterval);
    criticalInterval = null;
  }
  
  if (emergencyInterval) {
    clearInterval(emergencyInterval);
    emergencyInterval = null;
  }
  
  if (recoveryInterval) {
    clearInterval(recoveryInterval);
    recoveryInterval = null;
  }
  
  if (memoryGuardInterval) {
    clearInterval(memoryGuardInterval);
    memoryGuardInterval = null;
  }
  
  if (connectionForceInterval) {
    clearInterval(connectionForceInterval);
    connectionForceInterval = null;
  }

  console.log('[Survival-System] ✅ Sistema detenido completamente');
}

export function getSurvivalStatus(): object {
  return {
    active: survivalActive,
    levels: {
      critical: criticalInterval !== null,
      emergency: emergencyInterval !== null,
      recovery: recoveryInterval !== null,
      memoryGuard: memoryGuardInterval !== null,
      connectionForce: connectionForceInterval !== null
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    timestamp: new Date().toISOString()
  };
}

export function survivalStatusEndpoint(req: Request, res: Response) {
  res.json({
    status: 'Survival System Status',
    data: getSurvivalStatus()
  });
}