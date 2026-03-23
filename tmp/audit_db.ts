
import { db, pool } from "../server/db";
import { users, properties } from "../shared/schema";
import { sql } from "drizzle-orm";

async function audit() {
  console.log("--- DATABASE AUDIT ---");
  
  try {
    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables found:", tables.rows.map(r => r.table_name).join(", "));

    // Check users table columns
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log("\n'users' columns:", columns.rows.map(c => `${c.column_name} (${c.data_type})`).join(", "));

    // Check user count
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    console.log("\nTotal users:", userCount[0].count);

    // Check specific user editing fields
    const recentUsers = await db.select().from(users).limit(5);
    console.log("\nSample users (first 5):");
    recentUsers.forEach(u => {
      console.log(`- ID: ${u.id}, Username: ${u.username}, Nickname: ${u.nickname}, isAdmin: ${u.isAdmin}, isSuperAdmin: ${u.isSuperAdmin}`);
    });

    // Check properties count
    const propertyCount = await db.select({ count: sql<number>`count(*)` }).from(properties);
    console.log("\nTotal properties:", propertyCount[0].count);

  } catch (err) {
    console.error("Audit failed:", err);
  } finally {
    await pool.end();
  }
}

audit();
