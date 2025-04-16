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

async function updateForeignKeyConstraints() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  console.log(`Connecting to database...`);
  const sql = postgres(DATABASE_URL, { 
    ssl: 'require',
    max: 1, // Use a single connection
    idle_timeout: 10, // Shorter idle timeout
    connect_timeout: 30, // Longer connect timeout
  });
  
  try {
    console.log('Starting database schema update...');
    
    // First check if the constraint already has CASCADE behavior
    console.log('Checking constraint behavior...');
    const checkConstraint = await sql`
      SELECT confdeltype
      FROM pg_constraint
      JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
      WHERE pg_class.relname = 'cart_items'
      AND pg_constraint.contype = 'f'
      AND EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = pg_constraint.conrelid
        AND attnum = ANY(pg_constraint.conkey)
        AND attname = 'product_id'
      )
    `;
    
    // confdeltype 'c' means CASCADE
    if (checkConstraint.length > 0 && checkConstraint[0].confdeltype === 'c') {
      console.log('Constraint already has CASCADE behavior, no update needed');
      return;
    }
    
    // Execute the operations one by one with individual queries instead of a transaction
    console.log('Finding existing foreign key constraint name...');
    const constraintQuery = await sql`
      SELECT conname
      FROM pg_constraint
      JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
      WHERE pg_class.relname = 'cart_items'
      AND pg_constraint.contype = 'f'
      AND EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = pg_constraint.conrelid
        AND attnum = ANY(pg_constraint.conkey)
        AND attname = 'product_id'
      )
    `;
    
    if (constraintQuery.length === 0) {
      console.log('No constraint found to update');
      return;
    }
    
    const constraintName = constraintQuery[0].conname;
    console.log(`Found constraint: ${constraintName}`);
    
    // Drop the existing constraint
    console.log('Dropping existing constraint...');
    await sql`
      ALTER TABLE cart_items
      DROP CONSTRAINT ${sql(constraintName)}
    `;
    
    // Add the new constraint with CASCADE
    console.log('Adding new constraint with CASCADE...');
    await sql`
      ALTER TABLE cart_items
      ADD CONSTRAINT ${sql(`${constraintName}_cascade`)}
      FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE CASCADE
    `;
    
    console.log('Foreign key constraint updated successfully');
    console.log('Database schema update completed successfully');
  } catch (error) {
    console.error('Error updating database schema:', error);
    throw error;
  } finally {
    try {
      // Close the connection
      console.log('Closing database connection...');
      await sql.end({ timeout: 5 });
      console.log('Database connection closed');
    } catch (endError) {
      console.error('Error closing database connection:', endError);
    }
  }
}

// Execute the update
updateForeignKeyConstraints()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 