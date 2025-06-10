import { useEffect, useRef } from "react";

export function useConnectionGuard() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const pingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[ConnectionGuard] Iniciando protección del cliente...');

    // Ping cada 10 segundos al servidor
    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
        
        if (response.ok) {
          console.log(`[ConnectionGuard] ✅ Ping OK - ${new Date().toLocaleTimeString()}`);
        }
      } catch (error) {
        console.warn('[ConnectionGuard] ⚠️ Ping falló, reintentando...');
        // Reintento inmediato si falla
        setTimeout(async () => {
          try {
            await fetch('/api/health');
          } catch (retryError) {
            console.error('[ConnectionGuard] ❌ Reintento falló');
          }
        }, 2000);
      }
    }, 10000); // 10 segundos

    // Heartbeat más agresivo cada 5 segundos
    heartbeatRef.current = setInterval(() => {
      // Actividad del navegador para evitar suspensión
      const now = Date.now();
      localStorage.setItem('connectionGuard', now.toString());
      
      // Simular actividad mínima
      document.title = `Virtual Agent - ${now % 1000}`;
      
      console.log(`[ConnectionGuard] 💓 Heartbeat ${now}`);
    }, 5000); // 5 segundos

    // Ping ultra rápido cada 15 segundos para mantener conexión
    pingRef.current = setInterval(async () => {
      try {
        // Fetch simple sin esperar respuesta completa
        fetch('/api/survival-status', { 
          method: 'GET',
          keepalive: true 
        }).catch(() => {
          // Ignorar errores, solo mantener conexión
        });
        
        console.log('[ConnectionGuard] 🔄 Ultra-ping enviado');
      } catch (error) {
        // Silenciar errores para no saturar console
      }
    }, 15000); // 15 segundos

    // Listener para antes de cerrar la pestaña
    const handleBeforeUnload = () => {
      console.log('[ConnectionGuard] 🔌 Conexión mantenida hasta el final');
    };

    // Listener para visibilidad de la página
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[ConnectionGuard] 👁️ Página oculta, manteniendo conexión...');
        // Aumentar frecuencia cuando está oculta
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(async () => {
            try {
              await fetch('/api/health', { keepalive: true });
            } catch (error) {
              // Silenciar
            }
          }, 5000); // 5 segundos cuando está oculta
        }
      } else {
        console.log('[ConnectionGuard] 👁️ Página visible, frecuencia normal');
        // Restaurar frecuencia normal
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(async () => {
            try {
              const response = await fetch('/api/health');
              if (response.ok) {
                console.log('[ConnectionGuard] ✅ Reconectado');
              }
            } catch (error) {
              console.warn('[ConnectionGuard] ⚠️ Reintentando conexión...');
            }
          }, 10000); // 10 segundos normal
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      console.log('[ConnectionGuard] 🛑 Limpiando conexiones...');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (pingRef.current) {
        clearInterval(pingRef.current);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isActive: true
  };
}