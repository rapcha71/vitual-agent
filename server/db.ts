// CÓDIGO NUEVO Y CORRECTO
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  // Cloud SQL a menudo requiere una conexión segura (SSL)
  ssl: {
    rejectUnauthorized: false,
  },
});

// Conectamos el cliente antes de exportar la base de datos
await client.connect(); 

export const db = drizzle(client);
