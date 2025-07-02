import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// Verifica que la variable de entorno esté presente
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql", // Especificamos que usamos PostgreSQL
  dbCredentials: {
    url: process.env.DATABASE_URL, // Le decimos que use nuestra variable de entorno
  },
  verbose: true,
  strict: true,
});
