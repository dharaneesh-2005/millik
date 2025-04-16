import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function testProductDeletion() {
  // Get DATABASE_URL from environment variables
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  if (process.argv.length < 3) {
    console.error("Please provide a product ID to test deletion");
    console.log("Usage: npx tsx test-product-deletion.ts <productId>");
    process.exit(1);
  }
  
  const productId = parseInt(process.argv[2]);
  if (isNaN(productId)) {
    console.error("Invalid product ID. Please provide a number.");
    process.exit(1);
  }
  
  console.log(`Connecting to database...`);
  const sql = postgres(DATABASE_URL, { 
    ssl: 'require',
    max: 1 // Use a single connection
  });
  
  try {
    // First check if the product exists
    console.log(`Checking if product ${productId} exists...`);
    const product = await sql`SELECT * FROM products WHERE id = ${productId}`;
    
    if (product.length === 0) {
      console.error(`Product with ID ${productId} not found`);
      process.exit(1);
    }
    
    console.log(`Found product:`, product[0]);
    
    // Check for references in cart_items
    console.log(`Checking cart items referencing product ${productId}...`);
    const cartItems = await sql`SELECT * FROM cart_items WHERE product_id = ${productId}`;
    console.log(`Found ${cartItems.length} cart items referencing this product`);
    
    // Check for references in order_items
    console.log(`Checking order items referencing product ${productId}...`);
    const orderItems = await sql`SELECT * FROM order_items WHERE product_id = ${productId}`;
    console.log(`Found ${orderItems.length} order items referencing this product`);
    
    // Attempt to delete the product
    console.log(`\nAttempting to delete product ${productId}...`);
    try {
      await sql`DELETE FROM products WHERE id = ${productId}`;
      console.log(`Successfully deleted product ${productId}`);
      
      // Verify deletion
      const checkProduct = await sql`SELECT * FROM products WHERE id = ${productId}`;
      if (checkProduct.length === 0) {
        console.log(`Verified: Product ${productId} no longer exists in the database`);
      } else {
        console.error(`Product deletion verification failed: Product still exists`);
      }
      
      // Check if cart items were also deleted (should be due to CASCADE)
      const checkCartItems = await sql`SELECT * FROM cart_items WHERE product_id = ${productId}`;
      console.log(`After deletion: Found ${checkCartItems.length} cart items referencing this product (should be 0)`);
      
      // Check if order items were also deleted (should be due to CASCADE)
      const checkOrderItems = await sql`SELECT * FROM order_items WHERE product_id = ${productId}`;
      console.log(`After deletion: Found ${checkOrderItems.length} order items referencing this product (should be 0)`);
      
    } catch (error) {
      console.error(`Error deleting product:`, error);
    }
    
  } catch (error) {
    console.error(`Error testing product deletion:`, error);
  } finally {
    await sql.end();
  }
}

// Run the function
testProductDeletion()
  .then(() => console.log('Done'))
  .catch(err => console.error('Unhandled error:', err));