
const { Pool } = require('pg');
require('dotenv').config();

async function auditPrecision() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query('SELECT id, property_id, location, created_at FROM properties ORDER BY created_at ASC');
    console.log('--- Property Precision Audit ---');
    res.rows.forEach(row => {
      const { lat, lng } = row.location;
      const latDecimals = lat.toString().split('.')[1]?.length || 0;
      const lngDecimals = lng.toString().split('.')[1]?.length || 0;
      console.log(`ID: ${row.id} | Date: ${row.created_at} | Lat Prec: ${latDecimals} | Lng Prec: ${lngDecimals}`);
    });
  } catch (err) {
    console.error('Audit failed', err.stack);
  } finally {
    await pool.end();
  }
}

auditPrecision();
