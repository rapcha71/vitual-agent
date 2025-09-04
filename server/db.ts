// This file now only runs the database migration process.
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in environment variables.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(pool);

console.log("Checking for and running database migrations...");
try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log("Database migrations completed successfully!");
} catch (error) {
  console.error("Error during database migration:", error);
  process.exit(1); // Exit if migrations fail
} finally {
  await pool.end(); // Close the pool connection
  console.log("Migration check complete. Pool disconnected.");
}
