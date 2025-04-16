import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables from .env file
dotenv.config();

async function directDeleteTest() {
  const productId = process.argv[2] ? parseInt(process.argv[2]) : 10;
  
  // Get DATABASE_URL from environment variables
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  console.log(`Testing direct deletion of product ID: ${productId}`);
  console.log("=================================================");
  
  // Connect to PostgreSQL
  console.log(`Connecting to database...`);
  const sql = postgres(DATABASE_URL, { 
    ssl: 'require',
    max: 1 // Use a single connection
  });
  
  try {
    // Check if the product exists
    console.log(`\nChecking if product ${productId} exists...`);
    const product = await sql`SELECT * FROM products WHERE id = ${productId}`;
    
    if (product.length === 0) {
      console.error(`Product with ID ${productId} not found`);
      process.exit(1);
    }
    
    console.log(`Found product: ${product[0].name} (ID: ${product[0].id})`);
    
    // Check for references in order_items
    console.log(`\nChecking for order_items referencing this product...`);
    const orderItems = await sql`SELECT COUNT(*) as count FROM order_items WHERE product_id = ${productId}`;
    console.log(`Found ${orderItems[0].count} order items referencing this product`);
    
    if (parseInt(orderItems[0].count) > 0) {
      console.log(`Deleting order_items for product ID ${productId}...`);
      await sql`DELETE FROM order_items WHERE product_id = ${productId}`;
      console.log(`Order items deleted successfully`);
    }
    
    // Check for references in cart_items
    console.log(`\nChecking for cart_items referencing this product...`);
    const cartItems = await sql`SELECT COUNT(*) as count FROM cart_items WHERE product_id = ${productId}`;
    console.log(`Found ${cartItems[0].count} cart items referencing this product`);
    
    if (parseInt(cartItems[0].count) > 0) {
      console.log(`Deleting cart_items for product ID ${productId}...`);
      await sql`DELETE FROM cart_items WHERE product_id = ${productId}`;
      console.log(`Cart items deleted successfully`);
    }
    
    // Now delete the product directly
    console.log(`\nDirectly deleting product...`);
    const deleteResult = await sql`DELETE FROM products WHERE id = ${productId}`;
    console.log(`Delete operation complete`);
    
    // Verify product is deleted
    console.log(`\nVerifying product deletion...`);
    const checkProduct = await sql`SELECT COUNT(*) as count FROM products WHERE id = ${productId}`;
    
    if (parseInt(checkProduct[0].count) === 0) {
      console.log(`SUCCESS: Product with ID ${productId} has been deleted from the database.`);
    } else {
      console.error(`ERROR: Product with ID ${productId} still exists in the database.`);
    }
    
  } catch (error) {
    console.error(`Error during direct deletion test:`, error);
  } finally {
    await sql.end();
  }
}

// Run the function
directDeleteTest()
  .then(() => console.log('\nTest completed'))
  .catch(err => console.error('\nUnhandled error:', err));