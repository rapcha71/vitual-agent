require("dotenv").config();
const { scrypt, randomBytes } = require("crypto");
const { promisify } = require("util");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function resetPassword() {
  try {
    const password = "Virtual123!";
    const hashedPassword = await hashPassword(password);
    
    await pool.query(
      "UPDATE users SET password = $1 WHERE id = 24",
      [hashedPassword]
    );
    console.log("Password reset successfully for user ID 24 to:", password);
  } catch (e) {
    console.error(e);
  }
  await pool.end();
}

resetPassword();
