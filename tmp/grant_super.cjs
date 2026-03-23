
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_fYuis6K0IUGm@ep-sweet-leaf-a41dreb8.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function update() {
  try {
    await pool.query("UPDATE users SET is_admin = true, is_super_admin = true WHERE username = 'rapcha1971'");
    console.log("User rapcha1971 is now Super Admin.");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

update();
