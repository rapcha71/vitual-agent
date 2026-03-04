/** Logger: en producción solo errores; en desarrollo todo. Evita exponer datos sensibles (usernames, etc.) en logs de prod. */
const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  debug: (msg: string, ...args: unknown[]) => {
    if (isDev) console.log(`[DEBUG] ${msg}`, ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (isDev) console.log(`[INFO] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${msg}`, ...args);
  },
};
