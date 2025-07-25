import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import path from 'path';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno.");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log("Conectando a la base de datos...");
await client.connect();
console.log("Conexión a la base de datos exitosa.");

// La variable db debe existir antes de pasarla a migrate
export const db = drizzle(client);

console.log("Ejecutando migraciones de base de datos...");
// Le decimos a Drizzle que busque los archivos de migración en la carpeta 'drizzle'
await migrate(db, { migrationsFolder: './drizzle' });
console.log("¡Migraciones de base de datos completadas!");
