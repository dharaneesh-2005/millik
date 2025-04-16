import { eq } from "drizzle-orm";
import { cartItems } from "../shared/schema";
import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
try {
  if (fs.existsSync('.env') && !process.env.DATABASE_URL) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('Loaded environment variables from .env file');
  }
} catch (error) {
  console.error('Error loading .env file:', error);
}

async function deleteCartItem(cartItemId: number) {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  console.log(`Connecting to database...`);
  const client = postgres(DATABASE_URL, { ssl: 'require' });
  const db = drizzle(client);
  
  try {
    console.log(`Deleting cart item with ID: ${cartItemId}`);
    
    // Delete the cart item
    await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
    
    console.log(`Successfully deleted cart item with ID: ${cartItemId}`);
  } catch (error) {
    console.error(`Error deleting cart item:`, error);
  } finally {
    // Close the connection
    await client.end();
  }
}

// Get cart item ID from command line argument
const cartItemId = parseInt(process.argv[2]);
if (isNaN(cartItemId)) {
  console.error("Please provide a valid cart item ID as an argument");
  process.exit(1);
}

// Execute the deletion
deleteCartItem(cartItemId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
  }); 