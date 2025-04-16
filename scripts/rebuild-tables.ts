import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import { users, products, cartItems, contacts, orders, orderItems, settings, userRoleEnum } from "../shared/schema";
import { sql } from "drizzle-orm";

// Load env variables from .env file
dotenv.config();

async function rebuildTables() {
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
    // Step 1: Drop all tables if they exist (in reverse order of dependencies)
    console.log("Dropping existing tables...");
    
    try {
      await db.execute(sql`DROP TABLE IF EXISTS "settings" CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS "order_items" CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS "orders" CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS "contacts" CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS "cart_items" CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS "products" CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS "users" CASCADE`);
      await db.execute(sql`DROP TYPE IF EXISTS "user_role" CASCADE`);
      await db.execute(sql`DROP TYPE IF EXISTS "order_status" CASCADE`);
      await db.execute(sql`DROP TYPE IF EXISTS "payment_status" CASCADE`);
      
      console.log("All tables dropped successfully.");
    } catch (error) {
      console.error("Error dropping tables:", error);
      // Continue anyway as we'll try to create them
    }
    
    // Step 2: Create the enums
    console.log("Creating enum types...");
    await db.execute(sql`
      CREATE TYPE "user_role" AS ENUM ('user', 'admin');
    `);
    
    await db.execute(sql`
      CREATE TYPE "order_status" AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed');
    `);
    
    await db.execute(sql`
      CREATE TYPE "payment_status" AS ENUM ('pending', 'completed', 'failed', 'refunded');
    `);
    
    // Step 3: Create the tables
    console.log("Creating tables...");
    
    // Users table
    await db.execute(sql`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" TEXT,
        "phone" TEXT,
        "password" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "name" TEXT,
        "address" TEXT,
        "is_admin" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP,
        "updated_at" TIMESTAMP,
        "otp_secret" TEXT,
        "otp_enabled" BOOLEAN DEFAULT FALSE
      );
    `);
    
    // Products table
    await db.execute(sql`
      CREATE TABLE "products" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "price" TEXT NOT NULL,
        "compare_price" TEXT,
        "image" TEXT,
        "featured" BOOLEAN DEFAULT FALSE,
        "stock" INTEGER DEFAULT 0,
        "weight" TEXT,
        "weight_prices" TEXT,
        "category" TEXT,
        "tags" TEXT,
        "reviews" TEXT,
        "rating" REAL DEFAULT 0,
        "meta_data" TEXT,
        "created_at" TIMESTAMP,
        "updated_at" TIMESTAMP
      );
    `);
    
    // Cart Items table
    await db.execute(sql`
      CREATE TABLE "cart_items" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "session_id" TEXT,
        "product_id" INTEGER REFERENCES "products"("id") ON DELETE CASCADE,
        "quantity" INTEGER NOT NULL,
        "meta_data" TEXT,
        "created_at" TIMESTAMP
      );
    `);
    
    // Contacts table
    await db.execute(sql`
      CREATE TABLE "contacts" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "message" TEXT NOT NULL,
        "status" TEXT DEFAULT 'new',
        "created_at" TIMESTAMP,
        "updated_at" TIMESTAMP
      );
    `);
    
    // Orders table
    await db.execute(sql`
      CREATE TABLE "orders" (
        "id" SERIAL PRIMARY KEY,
        "email" TEXT,
        "phone" TEXT,
        "status" TEXT DEFAULT 'pending',
        "created_at" TIMESTAMP,
        "updated_at" TIMESTAMP,
        "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "session_id" TEXT,
        "order_number" TEXT NOT NULL,
        "total_amount" TEXT NOT NULL,
        "subtotal_amount" TEXT,
        "tax_amount" TEXT,
        "shipping_amount" TEXT,
        "discount_amount" TEXT,
        "payment_id" TEXT,
        "payment_method" TEXT NOT NULL,
        "payment_status" TEXT DEFAULT 'pending',
        "transaction_id" TEXT,
        "shipping_address" TEXT NOT NULL,
        "billing_address" TEXT,
        "shipping_method" TEXT DEFAULT 'standard',
        "notes" TEXT,
        "coupon_code" TEXT,
        "tracking_id" TEXT
      );
    `);
    
    // Order Items table
    await db.execute(sql`
      CREATE TABLE "order_items" (
        "id" SERIAL PRIMARY KEY,
        "order_id" INTEGER REFERENCES "orders"("id") ON DELETE CASCADE,
        "product_id" INTEGER REFERENCES "products"("id") ON DELETE SET NULL,
        "name" TEXT NOT NULL,
        "price" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "meta_data" TEXT
      );
    `);
    
    // Settings table
    await db.execute(sql`
      CREATE TABLE "settings" (
        "id" SERIAL PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT,
        "group" TEXT,
        "created_at" TIMESTAMP,
        "updated_at" TIMESTAMP
      );
    `);
    
    console.log("All tables created successfully.");
    
    // Step 4: Create an admin user
    console.log("Creating admin user...");
    
    // Using a default admin password
    await db.execute(sql`
      INSERT INTO "users" ("email", "username", "password", "role", "created_at")
      VALUES ('admin@example.com', 'admin_millikit', '$2b$10$0N5TUi5xG/tKTRboMmNkQuPL.JEXPvHT/zRGi0rYGTU5MJa.aHgbW', 'admin', NOW())
    `);
    
    console.log("Admin user created successfully. Username: admin_millikit, Password: admin123");
    
    // Step 5: Add sample data if needed
    console.log("Adding sample product...");
    
    await db.execute(sql`
      INSERT INTO "products" ("name", "slug", "description", "price", "compare_price", "stock", "category", "featured", "created_at")
      VALUES ('Example Product', 'example-product', 'This is a sample product', '100', '120', 10, 'sample', true, NOW())
    `);
    
    console.log("Sample product added successfully.");
    
    // List tables in database
    const tables = await queryClient`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log("\nTables in database:");
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
  } catch (error) {
    console.error("Error rebuilding tables:", error);
  } finally {
    await queryClient.end();
    console.log("Database connection closed.");
  }
}

rebuildTables().catch(console.error);