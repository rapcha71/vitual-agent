/**
 * fix-payments-after-may8.cjs
 *
 * Revierte a isPaid = false (Por pagar) todas las propiedades
 * ingresadas DESPUÉS del 8 de mayo de 2026 que quedaron marcadas
 * erróneamente como pagadas por el proceso automático.
 *
 * Uso: node scripts/fix-payments-after-may8.cjs
 */

require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  
  try {
    // Fecha de corte: propiedades creadas DESPUÉS del 8 de mayo
    // El 8 de mayo ya están pagadas correctamente según el usuario
    // El 9 de mayo en adelante deben estar "Por pagar"
    const CUTOFF_DATE = '2026-05-09T00:00:00.000Z';

    console.log('='.repeat(60));
    console.log('SCRIPT: Corrección de estados de pago incorrectos');
    console.log('='.repeat(60));
    console.log(`Corte: propiedades creadas desde ${CUTOFF_DATE}`);
    console.log('');

    // 1. Primero mostrar cuántas se van a afectar (modo preview)
    const preview = await client.query(`
      SELECT 
        property_id,
        created_at,
        is_paid,
        paid_at
      FROM properties
      WHERE created_at >= $1
        AND is_paid = true
      ORDER BY created_at ASC
    `, [CUTOFF_DATE]);

    if (preview.rows.length === 0) {
      console.log('✅ No se encontraron propiedades incorrectamente marcadas como pagadas.');
      console.log('   Nada que corregir.');
      return;
    }

    console.log(`⚠️  Se encontraron ${preview.rows.length} propiedad(es) marcadas como pagadas incorrectamente:\n`);
    
    preview.rows.forEach((row, i) => {
      const fecha = new Date(row.created_at).toLocaleString('es-CR', {
        timeZone: 'America/Costa_Rica',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const pagadaEn = row.paid_at 
        ? new Date(row.paid_at).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: 'short' })
        : 'N/A';
      console.log(`  ${i + 1}. ID: ${row.property_id} | Ingresada: ${fecha} | Marcada pagada: ${pagadaEn}`);
    });

    console.log('');
    console.log('Aplicando corrección...');

    // 2. Revertir: isPaid = false, paidAt = null
    const result = await client.query(`
      UPDATE properties
      SET 
        is_paid = false,
        paid_at = NULL
      WHERE created_at >= $1
        AND is_paid = true
      RETURNING property_id, created_at
    `, [CUTOFF_DATE]);

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ CORRECCIÓN APLICADA: ${result.rowCount} propiedad(es) revertidas a "Por pagar"`);
    console.log('='.repeat(60));
    console.log('');
    console.log('Propiedades corregidas:');
    result.rows.forEach((row, i) => {
      const fecha = new Date(row.created_at).toLocaleString('es-CR', {
        timeZone: 'America/Costa_Rica',
        day: '2-digit', month: 'short', year: 'numeric'
      });
      console.log(`  ${i + 1}. ${row.property_id} (ingresada: ${fecha})`);
    });
    console.log('');
    console.log('Estado final: isPaid = false, paidAt = NULL');
    console.log('Ahora aparecerán como "● Por pagar" en el panel admin.');

  } catch (err) {
    console.error('❌ ERROR al ejecutar el script:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
