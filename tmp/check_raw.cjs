
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fYuis6K0IUGm@ep-sweet-leaf-a41dreb8.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function check() {
  try {
    const res = await pool.query('SELECT * FROM properties LIMIT 5');
    console.log("--- RAW PROPERTIES ---");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
