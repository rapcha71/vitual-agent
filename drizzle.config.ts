import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();
console.log("Conexión simple a la base de datos establecida.");

export const db = drizzle(client);
