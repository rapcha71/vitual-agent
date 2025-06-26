import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Para Cloud SQL, no necesitamos websockets
// Solo configuramos cuando estamos en desarrollo con Neon
if (process.env.NODE_ENV === 'development') {
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Make sure Cloud SQL connection is configured correctly.",
  );
}

// Configuración específica para Cloud SQL
const connectionString = process.env.DATABASE_URL;

// Para Cloud SQL usamos pg directamente en lugar de neon-serverless
let db;

if (process.env.NODE_ENV === 'production' && connectionString.includes('cloudsql')) {
  // En producción con Cloud SQL
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  
  const pool = new Pool({
    connectionString,
    ssl: false, // Cloud SQL no requiere SSL para conexiones internas
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  db = drizzle(pool, { schema });
} else {
  // En desarrollo o con otras bases de datos
  const pool = new Pool({ connectionString });
  db = drizzle({ client: pool, schema });
}

export { db };
