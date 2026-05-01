require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAndRestore() {
  try {
    // Check if the old deleted user still exists under the DELETED email
    const deletedRes = await pool.query("SELECT * FROM users WHERE username = 'gg068124_DELETED@gmail.com'");
    const deletedUser = deletedRes.rows[0];

    // Check if a NEW user was created recently with the original email
    const newRes = await pool.query("SELECT * FROM users WHERE username = 'gg068124@gmail.com'");
    const newUser = newRes.rows[0];

    console.log("Deleted Account:", deletedUser ? deletedUser.id : "Not Found");
    console.log("New Account:", newUser ? newUser.id : "Not Found");
    
    if (deletedUser && !newUser) {
      // Just restore it
      console.log("Restoring old account...");
      await pool.query(
        "UPDATE users SET username = $1, email = $1, is_deleted = false WHERE id = $2",
        ["gg068124@gmail.com", deletedUser.id]
      );
      console.log("Restored successfully!");
    } else if (deletedUser && newUser) {
      // Complex: user created a new account! We would need to transfer the properties, then delete the old/new one
      console.log(`User created a NEW account (ID: ${newUser.id}). Old account is ID: ${deletedUser.id}. We need to associate properties to the NEW account or rename things.`);
      // Transfer properties
      await pool.query("UPDATE properties SET user_id = $1 WHERE user_id = $2", [newUser.id, deletedUser.id]);
      await pool.query("UPDATE messages SET sender_id = $1 WHERE sender_id = $2", [newUser.id, deletedUser.id]);
      await pool.query("UPDATE messages SET recipient_id = $1 WHERE recipient_id = $2", [newUser.id, deletedUser.id]);
      console.log("Reassigned properties and messages to the NEW account.");
      
      // Make sure old account stays deleted or get rid of it entirely if possible via hard delete?
      // Since it now has 0 properties and messages, let's hard delete it if possible
      await pool.query("DELETE FROM users WHERE id = $1", [deletedUser.id]);
      console.log("Transferred everything and hard-deleted the obsolete old account.");
    }
  } catch(e) { 
    console.error(e); 
  }
  await pool.end();
}
checkAndRestore();
