
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fYuis6K0IUGm@ep-sweet-leaf-a41dreb8.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function update() {
  try {
    await pool.query("UPDATE users SET is_admin = true, is_super_admin = true WHERE username = 'ricardo@buskocr.com'");
    console.log("User ricardo@buskocr.com successfully forced to Super Admin.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

update();
