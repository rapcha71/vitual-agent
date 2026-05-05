const { Pool } = require('pg');

async function checkColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  try {
    const res = await pool.query('SELECT * FROM properties LIMIT 1');
    console.log(Object.keys(res.rows[0] || {}));
  } finally {
    await pool.end();
  }
}

checkColumns();
