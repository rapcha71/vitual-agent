require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkGilberto() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE full_name ILIKE $1 OR username ILIKE $1", ['%Gilberto%']);
    console.log("Users found:", res.rows);
    
    // Simulate error based on unique constraint
    if (res.rows.length > 0) {
      console.log("Found existing Gilberto user, trying to insert duplicate...");
      const user = res.rows[0];
      try {
         await pool.query("INSERT INTO users (username, password, is_deleted, is_admin, is_super_admin) VALUES ($1, 'dummy', false, false, false)", [user.username]);
      } catch (e) {
         console.log("Duplicate insertion error:", e.message, e.code);
      }
    } else {
      console.log("No user named Gilberto found! It might have been hard-deleted.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkGilberto();
