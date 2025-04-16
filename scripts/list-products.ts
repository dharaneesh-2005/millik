import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function listProducts() {
  // Get DATABASE_URL from environment variables
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
  
  try {
    // List all products
    console.log(`Retrieving all products...`);
    const products = await sql`SELECT id, name, category FROM products ORDER BY id`;
    
    console.log(`Found ${products.length} products:`);
    products.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}, Category: ${p.category}`);
    });
    
  } catch (error) {
    console.error(`Error listing products:`, error);
  } finally {
    await sql.end();
  }
}

// Run the function
listProducts()
  .then(() => console.log('Done'))
  .catch(err => console.error('Unhandled error:', err));