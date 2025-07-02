import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

// Este bloque de código se ejecutará una sola vez cuando la aplicación inicie.
console.log("Inicializando conexión con la base de datos...");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno.");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Necesario para conectar de forma segura a Cloud SQL
    rejectUnauthorized: false,
  },
});

await client.connect();
console.log("Conexión con la base de datos establecida con éxito.");

export const db = drizzle(client);

console.log("Ejecutando migraciones de base de datos...");
// Le decimos a Drizzle que busque los archivos de migración en la carpeta 'drizzle'
await migrate(db, { migrationsFolder: './drizzle' });
console.log("Migraciones de base de datos completadas.");
