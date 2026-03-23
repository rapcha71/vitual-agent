
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fYuis6K0IUGm@ep-sweet-leaf-a41dreb8.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function migrate() {
  try {
    console.log("Starting property migration...");
    
    // 1. Ensure province is never null
    await pool.query("UPDATE properties SET province = '01' WHERE province IS NULL");
    
    // 2. Fetch all properties to re-generate IDs if they are in old format
    // Old format is usually GUID-like or random string. New is numeric-like XXTNNNNN.
    const res = await pool.query("SELECT id, property_type, province FROM properties");
    
    const typeMap = { house: "1", land: "2", commercial: "3" };
    
    for (let i = 0; i < res.rows.length; i++) {
       const prop = res.rows[i];
       const typeCode = typeMap[prop.property_type] || "1";
       const provinceCode = prop.province || "01";
       const consecutive = String(i + 1).padStart(5, "0");
       const newId = `${provinceCode}${typeCode}${consecutive}`;
       
       await pool.query("UPDATE properties SET property_id = $1 WHERE id = $2", [newId, prop.id]);
       console.log(`Updated Property ID: ${prop.id} -> ${newId}`);
    }
    
    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
