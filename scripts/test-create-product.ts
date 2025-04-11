import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { products } from '../shared/schema';

// Load environment variables from .env file
dotenv.config();

async function createTestProduct() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  console.log(`Connecting to database...`);
  const sql = postgres(DATABASE_URL, { 
    ssl: 'require',
    max: 1 // Use a single connection
  });
  
  const db = drizzle(sql);
  
  try {
    // Create a test product
    const testProduct = {
      name: "Test Product for Deletion",
      description: "This is a test product that will be deleted.",
      price: "99.99",
      category: "Test",
      imageUrl: "https://example.com/test.jpg",
      featured: false,
      inStock: true,
      slug: "test-product-for-deletion",
      reviews: null,
      weight: null,
      weightPrices: null,
      weightOptions: null
    };
    
    console.log("Creating test product...");
    const result = await db.insert(products).values(testProduct).returning();
    
    console.log("Test product created:", result[0]);
    console.log("Product ID:", result[0].id);
    
  } catch (error) {
    console.error("Error creating test product:", error);
  } finally {
    await sql.end();
  }
}

createTestProduct()
  .then(() => console.log("Test complete."))
  .catch(err => console.error("Unhandled error:", err));
