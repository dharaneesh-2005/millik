import postgres from 'postgres';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables from .env file
dotenv.config();

async function testApiDelete() {
  // Get DATABASE_URL from environment variables
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  if (process.argv.length < 3) {
    console.error("Please provide a product ID to test deletion");
    console.log("Usage: npx tsx test-api-delete.ts <productId>");
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
    
    // Test the API endpoint directly
    console.log(`\nTesting the DELETE API endpoint directly...`);
    const ADMIN_KEY = process.env.ADMIN_KEY || process.env.ADMIN_SECRET || "admin-secret";
    
    try {
      console.log(`Using admin key: ${ADMIN_KEY}`);
      
      // Use axios to make the request
      const response = await axios.delete(`http://localhost:3000/api/admin/products/${productId}`, {
        headers: {
          "x-admin-key": ADMIN_KEY
        }
      });
      
      console.log(`API Response Status:`, response.status);
      console.log(`API Response Data:`, response.data || "No data returned");
      
      // Verify deletion in database
      console.log(`\nVerifying product deletion in database...`);
      const checkProduct = await sql`SELECT * FROM products WHERE id = ${productId}`;
      
      if (checkProduct.length === 0) {
        console.log(`SUCCESS: Product ${productId} successfully deleted from database`);
      } else {
        console.error(`FAILURE: Product ${productId} still exists in database after DELETE API call`);
      }
    } catch (error: any) {
      console.error(`API Error:`, error.message);
      if (error.response) {
        console.error(`API Error Status:`, error.response.status);
        console.error(`API Error Data:`, error.response.data);
      }
    }
    
  } catch (error) {
    console.error(`Error testing product deletion:`, error);
  } finally {
    await sql.end();
  }
}

// Run the function
testApiDelete()
  .then(() => console.log('Done'))
  .catch(err => console.error('Unhandled error:', err));