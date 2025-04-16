import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import dotenv from "dotenv";
import { orders } from "../shared/schema";
import { sql } from "drizzle-orm";

// Load env variables from .env file
dotenv.config();

async function addTrackingIdColumn() {
  console.log("Loading environment variables...");
  
  // Get the database URL from environment variables
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  console.log("Database URL found, connecting to database...");
  
  // Create a postgres client for both raw SQL and Drizzle
  const queryClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(queryClient);
  
  try {
    // Check if tracking_id column exists
    const columnExists = await queryClient`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'tracking_id'
      );
    `;
    
    const exists = columnExists[0]?.exists || false;
    
    if (exists) {
      console.log("Column 'tracking_id' already exists in the 'orders' table.");
    } else {
      console.log("Adding 'tracking_id' column to 'orders' table...");
      
      // Add the tracking_id column using drizzle's sql template
      await db.execute(sql`
        ALTER TABLE orders
        ADD COLUMN tracking_id TEXT;
      `);
      
      console.log("Column 'tracking_id' added successfully.");
    }
    
    // List all columns in the orders table
    const columns = await queryClient`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
      ORDER BY ordinal_position;
    `;
    
    console.log("\nColumns in 'orders' table:");
    columns.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error("Error adding tracking_id column:", error);
  } finally {
    await queryClient.end();
    console.log("Database connection closed.");
  }
}

addTrackingIdColumn().catch(console.error);