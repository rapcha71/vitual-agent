// WebAuthn configuration
export const rpName = 'Virtual Agent';
export const rpID = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'localhost';
export const origin = process.env.REPL_SLUG ? `https://${rpID}` : `http://${rpID}:5000`;
