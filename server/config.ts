// WebAuthn configuration
// En producción: APP_URL debe ser el dominio (ej. https://vitual-agent.railway.app)
// En Replit: REPL_SLUG.REPL_OWNER.repl.co
const getRpID = () => {
  if (process.env.APP_URL) {
    try {
      const url = new URL(process.env.APP_URL);
      return url.hostname;
    } catch {
      return 'localhost';
    }
  }
  if (process.env.REPL_SLUG) return `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  return 'localhost';
};
export const rpName = 'Virtual Agent';
export const rpID = getRpID();
export const origin = process.env.APP_URL 
  ? process.env.APP_URL 
  : process.env.REPL_SLUG 
    ? `https://${rpID}` 
    : `http://${rpID}:5000`;
