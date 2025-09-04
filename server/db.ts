import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno.");
}

// Create a connection pool instead of a single client
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log("Conectando a la base de datos...");
// The pool manages connections, so we don't need to explicitly connect.
// A connection will be established when the first query is made.
console.log("Pool de conexiones de base de datos creado.");

// Create the Drizzle instance using the pool
export const db = drizzle(pool);

console.log("Ejecutando migraciones de base de datos...");
// Run migrations
try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log("¡Migraciones de base de datos completadas!");
} catch (error) {
  console.error("Error durante la migración de la base de datos:", error);
  // We don't re-throw the error here to allow the app to start even if migrations fail,
  // but we log it prominently. In a real production scenario, you might want to handle this differently.
}
