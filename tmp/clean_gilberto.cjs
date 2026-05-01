require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function checkDeps() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE username = 'gg068124@gmail.com'");
    const user = res.rows[0];
    if (user) {
      const props = await pool.query("SELECT count(*) FROM properties WHERE user_id = $1", [user.id]);
      const msgs1 = await pool.query("SELECT count(*) FROM messages WHERE sender_id = $1", [user.id]);
      const msgs2 = await pool.query("SELECT count(*) FROM messages WHERE recipient_id = $1", [user.id]);
      console.log("Props:", props.rows[0].count, "Msgs sent:", msgs1.rows[0].count, "Msgs received:", msgs2.rows[0].count);
      
      // Let's delete the user! We can just modify the username slightly to allow re-registration, or cascade delete.
      // Easiest is to rename the username so the user can re-register!
      console.log("Renaming user gg068124@gmail.com to gg068124_DELETED@gmail.com");
      await pool.query("UPDATE users SET username = $1, email = $1 WHERE id = $2", ["gg068124_DELETED@gmail.com", user.id]);
      console.log("User renamed successfully!");
    } else {
      console.log("User not found.");
    }
  } catch(e) { console.error(e); }
  await pool.end();
}
checkDeps();
