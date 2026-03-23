
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fYuis6K0IUGm@ep-sweet-leaf-a41dreb8.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function check() {
  try {
    // Check property columns
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'properties'
    `);
    console.log("--- PROPERTIES COLUMNS ---");
    console.table(columns.rows);

    // Check count
    const countRes = await pool.query('SELECT COUNT(*) FROM properties');
    console.log("\nTotal Properties:", countRes.rows[0].count);

    // Check sample properties
    const res = await pool.query('SELECT id, property_id, user_id, province, sign_phone_number FROM properties LIMIT 10');
    console.log("\n--- SAMPLE PROPERTIES ---");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
