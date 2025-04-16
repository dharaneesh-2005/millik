import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function debugProductDeletion() {
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
    // 1. Check for foreign key constraints
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
    });
    
    // 2. Fix constraints without CASCADE for product deletion
    console.log("\nFixing constraints without CASCADE delete rule...");
    
    for (const constraint of constraints) {
      if (constraint.delete_rule !== 'CASCADE') {
        console.log(`Updating constraint ${constraint.constraint_name} to use CASCADE...`);
        
        try {
          // Drop the existing constraint
          await sql`
            ALTER TABLE ${sql(constraint.table_name)}
            DROP CONSTRAINT ${sql(constraint.constraint_name)}
          `;
          
          // Add the new constraint with CASCADE
          await sql`
            ALTER TABLE ${sql(constraint.table_name)}
            ADD CONSTRAINT ${sql(`${constraint.constraint_name}_cascade`)}
            FOREIGN KEY (${sql(constraint.column_name)})
            REFERENCES ${sql(constraint.foreign_table_name)}(${sql(constraint.foreign_column_name)})
            ON DELETE CASCADE
          `;
          
          console.log(`Successfully updated constraint ${constraint.constraint_name} to use CASCADE`);
        } catch (error) {
          console.error(`Error updating constraint ${constraint.constraint_name}:`, error);
        }
      } else {
        console.log(`Constraint ${constraint.constraint_name} already has CASCADE delete rule`);
      }
    }
    
    // 3. Check for related records in order_items
    console.log("\nChecking if there are order_items referencing products...");
    const orderItems = await sql`
      SELECT oi.id, oi.order_id, oi.product_id
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
    `;
    
    console.log(`Found ${orderItems.length} order_items referencing products`);
    
    // Check if order_items has a foreign key constraint to products with CASCADE
    console.log("\nChecking order_items foreign key constraints...");
    const orderItemsConstraints = await sql`
      SELECT
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
        AND tc.table_name = 'order_items'
        AND ccu.table_name = 'products'
    `;
    
    console.log("Order items constraints referencing products:");
    if (orderItemsConstraints.length === 0) {
      console.log("No constraints found - need to add one!");
      
      // Add a foreign key constraint with CASCADE
      try {
        console.log("Adding foreign key constraint with CASCADE to order_items...");
        await sql`
          ALTER TABLE order_items
          ADD CONSTRAINT order_items_product_id_fkey
          FOREIGN KEY (product_id)
          REFERENCES products(id)
          ON DELETE CASCADE
        `;
        console.log("Successfully added order_items_product_id_fkey constraint with CASCADE");
      } catch (error) {
        console.error("Error adding constraint:", error);
      }
    } else {
      orderItemsConstraints.forEach(c => {
        console.log(`- Table ${c.table_name}, Column ${c.column_name} references products(${c.foreign_column_name})`);
        console.log(`  Constraint name: ${c.constraint_name}`);
        console.log(`  ON DELETE: ${c.delete_rule}, ON UPDATE: ${c.update_rule}`);
        
        // If constraint doesn't have CASCADE, update it
        if (c.delete_rule !== 'CASCADE') {
          console.log(`Updating order_items constraint ${c.constraint_name} to use CASCADE...`);
          
          try {
            // Drop the existing constraint
            sql`
              ALTER TABLE order_items
              DROP CONSTRAINT ${sql(c.constraint_name)}
            `.then(() => {
              // Add the new constraint with CASCADE
              return sql`
                ALTER TABLE order_items
                ADD CONSTRAINT ${sql(`${c.constraint_name}_cascade`)}
                FOREIGN KEY (${sql(c.column_name)})
                REFERENCES ${sql(c.foreign_table_name)}(${sql(c.foreign_column_name)})
                ON DELETE CASCADE
              `;
            }).then(() => {
              console.log(`Successfully updated constraint ${c.constraint_name} to use CASCADE`);
            }).catch(err => {
              console.error(`Error updating constraint ${c.constraint_name}:`, err);
            });
          } catch (error) {
            console.error(`Error handling constraint ${c.constraint_name}:`, error);
          }
        } else {
          console.log(`Constraint ${c.constraint_name} already has CASCADE delete rule`);
        }
      });
    }
    
    // 4. Look for issues with specific product
    if (process.argv.length > 2) {
      const productId = parseInt(process.argv[2]);
      if (!isNaN(productId)) {
        console.log(`\nChecking specific product ID: ${productId}`);
        
        // Check if product exists
        const product = await sql`SELECT * FROM products WHERE id = ${productId}`;
        if (product.length === 0) {
          console.log(`Product with ID ${productId} not found`);
        } else {
          console.log(`Product found:`, product[0]);
          
          // Check for references in cart_items
          const cartItems = await sql`SELECT * FROM cart_items WHERE product_id = ${productId}`;
          console.log(`Found ${cartItems.length} cart items referencing this product`);
          
          // Check for references in order_items
          const productOrderItems = await sql`SELECT * FROM order_items WHERE product_id = ${productId}`;
          console.log(`Found ${productOrderItems.length} order items referencing this product`);
          
          if (productOrderItems.length > 0) {
            console.log(`First order item:`, productOrderItems[0]);
            
            // Get the related order
            const orderId = productOrderItems[0].order_id;
            const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
            if (order.length > 0) {
              console.log(`Related order:`, order[0]);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`Error debugging product deletion:`, error);
  } finally {
    await sql.end();
  }
}

// Run the function with optional product ID argument
debugProductDeletion()
  .then(() => console.log('Done'))
  .catch(err => console.error('Unhandled error:', err));