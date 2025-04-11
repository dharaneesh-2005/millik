import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function checkConstraints() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  console.log(`Connecting to database...`);
  const sql = postgres(DATABASE_URL, { ssl: 'require' });
  
  try {
    console.log("Checking foreign key constraints referencing products table...");
    
    const constraints = await sql`
      SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'products'
    `;
    
    console.log("Foreign key constraints referencing products:");
    constraints.forEach(c => {
      console.log(`- Table ${c.table_name}, Column ${c.column_name} references products(${c.foreign_column_name})`);
      console.log(`  Constraint name: ${c.constraint_name}`);
      console.log(`  ON DELETE: ${c.delete_rule}, ON UPDATE: ${c.update_rule}`);
      console.log('---');
    });
    
    // Check for any references to products in order_items table
    console.log("\nChecking for order_items table structure and references:");
    const orderItemsColumns = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'order_items'
      ORDER BY ordinal_position
    `;
    
    console.log("order_items table columns:");
    orderItemsColumns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
      console.log(`  Default: ${col.column_default || 'none'}, Nullable: ${col.is_nullable}`);
    });
    
    // Check for existing constraints in order_items table
    console.log("\nChecking for existing constraints in order_items table:");
    const orderItemsConstraints = await sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        CASE WHEN tc.constraint_type = 'FOREIGN KEY' 
              THEN ccu.table_name 
              ELSE NULL 
        END AS referenced_table,
        CASE WHEN tc.constraint_type = 'FOREIGN KEY' 
              THEN ccu.column_name 
              ELSE NULL 
        END AS referenced_column,
        CASE WHEN tc.constraint_type = 'FOREIGN KEY' 
              THEN rc.delete_rule 
              ELSE NULL 
        END AS delete_rule
      FROM 
        information_schema.table_constraints AS tc
        LEFT JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON tc.constraint_name = ccu.constraint_name
        LEFT JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'order_items'
    `;
    
    console.log("order_items table constraints:");
    orderItemsConstraints.forEach(c => {
      console.log(`- ${c.constraint_name} (${c.constraint_type}) on column ${c.column_name}`);
      if (c.constraint_type === 'FOREIGN KEY') {
        console.log(`  References ${c.referenced_table}(${c.referenced_column})`);
        console.log(`  ON DELETE: ${c.delete_rule}`);
      }
    });
    
  } catch (error) {
    console.error(`Error checking constraints:`, error);
  } finally {
    await sql.end();
  }
}

// Run the function
checkConstraints()
  .then(() => console.log('Done'))
  .catch(err => console.error('Unhandled error:', err));