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

async function forceDeleteProduct(productId: number) {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  console.log(`Connecting to database...`);
  const sql = postgres(DATABASE_URL, { ssl: 'require' });
  
  try {
    // Log the product we're trying to delete
    console.log(`Retrieving product with ID ${productId} before deletion...`);
    const product = await sql`SELECT * FROM products WHERE id = ${productId}`;
    console.log('Product to delete:', product);
    
    // First check for all possible references to this product
    console.log(`Checking for cart items referencing product ${productId}...`);
    const cartItems = await sql`SELECT * FROM cart_items WHERE product_id = ${productId}`;
    console.log(`Found ${cartItems.length} cart items referencing this product`);
    
    // Use a transaction to ensure all operations succeed or fail together
    await sql.begin(async (tx) => {
      // Temporarily disable constraints
      console.log('Temporarily disabling foreign key constraints...');
      await tx`SET CONSTRAINTS ALL DEFERRED`;
      
      // Delete any cart items that reference this product
      if (cartItems.length > 0) {
        console.log(`Deleting ${cartItems.length} cart items that reference product ${productId}`);
        await tx`DELETE FROM cart_items WHERE product_id = ${productId}`;
      }
      
      // Force delete the product
      console.log(`Force deleting product with ID ${productId}`);
      const result = await tx`DELETE FROM products WHERE id = ${productId}`;
      console.log('Deletion result:', result);
      
      // Re-enable constraints
      console.log('Re-enabling foreign key constraints...');
      await tx`SET CONSTRAINTS ALL IMMEDIATE`;
    });
    
    console.log(`Successfully deleted product with ID: ${productId}`);
  } catch (error) {
    console.error(`Error force-deleting product:`, error);
  } finally {
    // Close the connection
    await sql.end();
  }
}

// Get product ID from command line argument
const productId = parseInt(process.argv[2]);
if (isNaN(productId)) {
  console.error("Please provide a valid product ID as an argument");
  process.exit(1);
}

// Execute the force deletion
forceDeleteProduct(productId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
  }); 