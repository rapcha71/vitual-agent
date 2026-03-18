
import { pool } from '../server/db';
import { logger } from '../server/lib/logger';

async function migrate() {
  logger.info("--- Agregando columnas thumbnails y blurhashes ---");
  try {
    // Agregar columnas si no existen
    await pool.query(`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS thumbnails jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS blurhashes jsonb DEFAULT '[]'::jsonb
    `);
    
    logger.info("✅ Columnas agregadas correctamente.");
  } catch (error) {
    logger.error("Error en la migración de columnas:", error);
  } finally {
    process.exit(0);
  }
}

migrate();
