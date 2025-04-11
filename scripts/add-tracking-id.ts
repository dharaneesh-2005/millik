import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function addTrackingIdColumn() {
  try {
    console.log("Connecting to database...");
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable not found");
    }
    
    console.log("Database URL found, connecting...");
    const client = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
    const db = drizzle(client);
    
    console.log("Adding tracking_id column to orders table...");
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_id TEXT;`);
    console.log("✅ tracking_id column added successfully");
    
    // Close connection
    await client.end();
  } catch (error) {
    console.error("Error adding tracking_id column:", error);
    process.exit(1);
  }
}

addTrackingIdColumn().then(() => {
  console.log("Script completed successfully");
  process.exit(0);
}).catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});