import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

console.log("Creando cliente de base de datos...");
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  // Cloud SQL a menudo requiere una conexión segura (SSL)
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log("Conectando a la base de datos...");
await client.connect();
console.log("Conexión a la base de datos exitosa.");

// La variable db debe existir antes de pasarla a migrate
export const db = drizzle(client);

console.log("Buscando y aplicando migraciones de base de datos...");
// Asumimos que la carpeta 'drizzle' con las migraciones está en la raíz del proyecto
await migrate(db, { migrationsFolder: './drizzle' });
console.log("¡Migraciones de base de datos completadas!");
