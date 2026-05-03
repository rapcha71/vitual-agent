import * as dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import { detectLocationFromCoords } from '../server/lib/geo-utils.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log("Restaurando coordenadas originales de 02200032 y corrigiendo Cantón basado en GPS...");

    // 1. Revertir el error de mi script anterior: restaurar el GPS real
    await pool.query(`
      UPDATE properties 
      SET location = jsonb_set(
                       jsonb_set(location, '{lat}', '9.90669'::jsonb),
                       '{lng}', '-84.0277764'::jsonb
                     )
      WHERE property_id = '02200032'
    `);
    console.log("✅ Coordenadas reales restauradas para 02200032 (9.90669, -84.0277764)");

    // 2. Escanear todas las propiedades y actualizar su PROVINCIA y CANTÓN basado ÚNICAMENTE en el GPS
    const result = await pool.query(`
      SELECT 
        id,
        property_id, 
        province,
        district, 
        (location->>'lat')::numeric as lat, 
        (location->>'lng')::numeric as lng 
      FROM properties
      WHERE location IS NOT NULL;
    `);
    
    let updatedCount = 0;
    
    for (const row of result.rows) {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      
      // Saltamos las que no tienen GPS real
      if (lat === 0 && lng === 0) continue;

      // El GPS es la única fuente de verdad: detectar dónde está físicamente
      const geoResult = detectLocationFromCoords(lat, lng);
      
      if (geoResult.valid && geoResult.district) {
        // Si el GPS dice que está en un cantón diferente al que dice la DB, el GPS manda
        if (row.district !== geoResult.district || row.province !== geoResult.province) {
          console.log(`[CORRIGIENDO ETIQUETAS] Propiedad ${row.property_id}:`);
          console.log(`  - GPS Físico: ${lat}, ${lng}`);
          console.log(`  - Etiqueta DB errónea: Prov ${row.province}, Cantón ${row.district}`);
          console.log(`  - Etiqueta REAL calculada: Prov ${geoResult.province}, Cantón ${geoResult.district} (${geoResult.cantonLabel})`);

          await pool.query(`
            UPDATE properties 
            SET province = $1, district = $2
            WHERE id = $3
          `, [geoResult.province, geoResult.district, row.id]);
          
          updatedCount++;
        }
      }
    }

    console.log(`\\n¡Corrección finalizada! Se actualizaron las etiquetas de ${updatedCount} propiedades para que coincidan con su GPS real.`);

  } catch (err) {
    console.error("Error durante la corrección:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
