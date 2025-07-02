// Este es un script de prueba para ver si la DATABASE_URL funciona.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

console.log('--- INICIANDO SCRIPT DE DEPURACIÓN ---');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('ERROR FATAL: La variable DATABASE_URL NO está llegando al contenedor.');
  process.exit(1);
}

// Imprimimos la URL de forma segura, sin la contraseña
const safeUrl = dbUrl.substring(0, dbUrl.indexOf('@')) + '@...REDACTED...';
console.log('Variable DATABASE_URL recibida:', safeUrl);

try {
  console.log('Intentando inicializar el cliente de la base de datos...');
  const sql = neon(dbUrl);
  const db = drizzle(sql);
  console.log('✅ ¡ÉXITO! El cliente de la base de datos se inicializó correctamente.');
  console.log('Esto significa que la DATABASE_URL es correcta.');
} catch (e) {
  console.error('🔴 ¡FALLÓ! Hubo un error al inicializar el cliente de la base de datos.');
  console.error('Es muy probable que el formato de tu DATABASE_URL sea incorrecto o le falte algún parámetro.');
  console.error('Error específico:', e.message);
  process.exit(1);
}
