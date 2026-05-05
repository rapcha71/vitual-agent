const { Pool } = require('pg');

async function checkThumbnails() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT property_id, thumbnails FROM properties WHERE thumbnails IS NOT NULL LIMIT 2');
    for (const row of res.rows) {
      console.log('Property:', row.property_id);
      if (row.thumbnails && Array.isArray(row.thumbnails) && row.thumbnails.length > 0) {
        console.log('Thumbnail 0 length:', row.thumbnails[0].length);
      } else {
        console.log('Thumbnails array empty or invalid');
      }
    }
  } finally {
    await pool.end();
  }
}
checkThumbnails();
