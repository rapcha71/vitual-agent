import * as dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log("Verificando TIPOS de las coordenadas (strings vs numbers, comas, etc):\\n");

    const result = await pool.query(`
      SELECT 
        property_id, 
        district, 
        location->>'lat' as lat_str, 
        location->>'lng' as lng_str,
        pg_typeof(location->'lat') as lat_type,
        pg_typeof(location->'lng') as lng_type
      FROM properties;
    `);
    
    let anomalies = 0;
    for (const row of result.rows) {
      const { lat_str, lng_str, lat_type, lng_type } = row;
      
      if (lat_type !== 'numeric' && lat_type !== 'integer' && lat_type !== 'double precision') {
        // En jsonb los numeros deberian ser 'numeric' en pg_typeof
      }
      
      if (Number.isNaN(Number(lat_str)) || Number.isNaN(Number(lng_str))) {
         console.log(`❌ NAN DETECTADO! ID: ${row.property_id} | Lat: "${lat_str}" | Lng: "${lng_str}"`);
         anomalies++;
      }
    }
    
    console.log(`Terminado. Anomalías encontradas: ${anomalies}`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
