
const { Pool } = require('pg');
require('dotenv').config();

async function checkProperties() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query('SELECT id, property_id, location, property_type FROM properties LIMIT 10');
    console.log('Sample properties from DB:');
    res.rows.forEach(row => {
      console.log(`ID: ${row.id}, PropertyID: ${row.property_id}, Type: ${row.property_type}`);
      console.log(`Location: ${JSON.stringify(row.location, null, 2)}`);
      
      const { lat, lng } = row.location;
      // Precision check: how many decimal places?
      const latDecimals = lat.toString().split('.')[1]?.length || 0;
      const lngDecimals = lng.toString().split('.')[1]?.length || 0;
      console.log(`Precision: Lat(${latDecimals} decimals), Lng(${lngDecimals} decimals)`);
      if (latDecimals < 4 || lngDecimals < 4) {
        console.warn('WARNING: Low precision detected!');
      }
      console.log('---');
    });
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await pool.end();
  }
}

checkProperties();
