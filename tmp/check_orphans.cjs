
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fYuis6K0IUGm@ep-sweet-leaf-a41dreb8.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT p.id, p.property_id, p.user_id, u.id as user_actual_id
      FROM properties p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE u.id IS NULL
    `);
    console.log("--- PROPERTIES WITH MISSING USERS ---");
    console.table(res.rows);
    console.log("Total orphans:", res.rows.length);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
