import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { users, products, cartItems, contacts, InsertProduct } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Sample product data defined directly here to avoid importing from a separate file
const sampleProducts: InsertProduct[] = [
  {
    name: "Organic Foxtail Millet",
    slug: "organic-foxtail-millet",
    description: "Foxtail millet is one of the oldest cultivated millets, known for its high nutritional value.",
    shortDescription: "Nutrient-rich ancient grain, perfect for healthy meals.",
    price: "150.00", 
    comparePrice: "180.00",
    badge: "Organic",
    category: "Grains",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e8c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
    imageGallery: [
      "https://images.unsplash.com/photo-1586201375761-83865001e8c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
    ],
    inStock: true,
    stockQuantity: 50,
    featured: true,
    nutritionFacts: "Serving Size: 100g, Calories: 364, Protein: 11.5g, Fat: 4g, Carbohydrates: 72g",
    cookingInstructions: "Rinse thoroughly before cooking. Use 1 part millet to 2.5 parts water.",
    rating: "4.8",
    reviewCount: 24,
    weightOptions: ["500g", "1kg", "2kg"],
    reviews: JSON.stringify([
      {
        id: "1", 
        name: "Ananya Sharma", 
        avatar: "https://randomuser.me/api/portraits/women/17.jpg", 
        date: "2023-06-15", 
        rating: 5, 
        comment: "This foxtail millet is amazing! I made a delicious pulao with it and my family loved it.",
        helpfulCount: 8
      }
    ])
  },
  {
    name: "Barnyard Millet Flour",
    slug: "barnyard-millet-flour",
    description: "Our stone-ground barnyard millet flour is a perfect gluten-free alternative for your baking needs.",
    shortDescription: "Gluten-free flour with high fiber content.",
    price: "180.00",
    comparePrice: "200.00",
    badge: "Gluten-Free",
    category: "Flour",
    imageUrl: "https://images.unsplash.com/photo-1586201375800-744e8cf7cdea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
    imageGallery: [
      "https://images.unsplash.com/photo-1586201375800-744e8cf7cdea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
    ],
    inStock: true,
    stockQuantity: 30,
    featured: true,
    nutritionFacts: "Serving Size: 100g, Calories: 342, Protein: 10.8g, Fat: 3.9g, Carbohydrates: 65.5g",
    cookingInstructions: "Can replace regular flour in most recipes. For bread and baked goods, best results when mixed with other flours.",
    rating: "4.6",
    reviewCount: 18,
    weightOptions: ["500g", "1kg"],
    reviews: JSON.stringify([
      {
        id: "1", 
        name: "Priya Patel", 
        avatar: "https://randomuser.me/api/portraits/women/44.jpg", 
        date: "2023-06-02", 
        rating: 5, 
        comment: "I've been looking for gluten-free alternatives for my daughter, and this flour is perfect!",
        helpfulCount: 7
      }
    ])
  }
];

/**
 * Initialize the database connection and run migrations
 */
export async function initializeDatabase(url: string) {
  console.log('Initializing database connection...');
  try {
    // Create a postgres client for migrations
    const migrationClient = postgres(url, { ssl: 'require' });
    // Create a drizzle instance for migrations
    const migrationDb = drizzle(migrationClient);
    
    // Create necessary tables if they don't exist
    await migrationDb.execute(`
      -- No longer dropping existing tables to preserve customer orders
      -- Instead, we'll create tables if they don't exist and update structure if needed
      
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        hashed_password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        address TEXT,
        phone TEXT,
        otp_secret TEXT,
        otp_enabled BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Update existing users table structure if needed
      DO $$
      BEGIN
        -- Make username column nullable if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
          ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
        END IF;
        
        -- Make password column nullable if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
          ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        END IF;

        -- Check if we need to rename password column to hashed_password
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') AND 
           NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hashed_password') THEN
          -- Add hashed_password column if it doesn't exist
          ALTER TABLE users ADD COLUMN hashed_password TEXT;
          -- Copy values from password to hashed_password
          UPDATE users SET hashed_password = password;
          -- Make hashed_password NOT NULL after data is copied
          ALTER TABLE users ALTER COLUMN hashed_password SET NOT NULL;
          -- Optionally drop the old password column if you're sure it's safe to do so
          -- ALTER TABLE users DROP COLUMN password;
        END IF;
        
        -- If username exists but email doesn't, copy username to email
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') AND 
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
          -- Update users where email is null
          UPDATE users SET email = username WHERE email IS NULL;
          
          -- Also update admin users who might have non-email usernames
          UPDATE users SET email = 'admin@millikit.com' WHERE username = 'admin_millikit' AND email IS NULL;
        END IF;
        
        -- Add any missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
          ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
          ALTER TABLE users ADD COLUMN name TEXT;
          UPDATE users SET name = username WHERE name IS NULL;
          ALTER TABLE users ALTER COLUMN name SET NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
          ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        END IF;
        
        -- Add address column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address') THEN
          ALTER TABLE users ADD COLUMN address TEXT;
        END IF;
        
        -- Add is_admin column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
          ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        END IF;
        
        -- Add phone column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
          ALTER TABLE users ADD COLUMN phone TEXT;
        END IF;
        
        -- Add otp_secret column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'otp_secret') THEN
          ALTER TABLE users ADD COLUMN otp_secret TEXT;
        END IF;
        
        -- Add otp_enabled column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'otp_enabled') THEN
          ALTER TABLE users ADD COLUMN otp_enabled BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
      
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        short_description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        compare_price DECIMAL(10, 2),
        badge TEXT,
        category TEXT NOT NULL,
        image_url TEXT NOT NULL,
        image_gallery TEXT[],
        in_stock BOOLEAN DEFAULT TRUE,
        stock_quantity INTEGER DEFAULT 0,
        featured BOOLEAN DEFAULT FALSE,
        nutrition_facts TEXT,
        cooking_instructions TEXT,
        rating DECIMAL(3, 2),
        review_count INTEGER DEFAULT 0,
        weight_options TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        reviews TEXT
      );
      
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        session_id TEXT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        meta_data TEXT
      );
      
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        email TEXT,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        user_id INTEGER DEFAULT 1, -- Default to guest user
        session_id TEXT,
        order_number TEXT NOT NULL UNIQUE,
        total_amount TEXT NOT NULL,
        subtotal_amount TEXT NOT NULL,
        tax_amount TEXT NOT NULL,
        shipping_amount TEXT NOT NULL,
        discount_amount TEXT DEFAULT '0',
        payment_id TEXT,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('razorpay', 'cod', 'bank_transfer')),
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
        transaction_id TEXT,
        shipping_address TEXT NOT NULL,
        billing_address TEXT,
        shipping_method TEXT DEFAULT 'standard',
        notes TEXT,
        coupon_code TEXT
      );
      
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        meta_data TEXT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        subtotal TEXT NOT NULL,
        weight TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        group_name TEXT
      );
      
      -- Add any missing columns to products table
      DO $$
      BEGIN
        -- Add short_description column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'short_description') THEN
          ALTER TABLE products ADD COLUMN short_description TEXT;
        END IF;
        
        -- Add badge column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'badge') THEN
          ALTER TABLE products ADD COLUMN badge TEXT;
        END IF;
        
        -- Add image_url column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url') THEN
          ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT 'https://via.placeholder.com/400';
        END IF;
        
        -- Add image_gallery column if it doesn't exist (as array type)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_gallery') THEN
          ALTER TABLE products ADD COLUMN image_gallery TEXT[];
        END IF;
        
        -- Add in_stock column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'in_stock') THEN
          ALTER TABLE products ADD COLUMN in_stock BOOLEAN DEFAULT TRUE;
        END IF;
        
        -- Add stock_quantity column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
          ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
        END IF;
        
        -- Add nutrition_facts column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'nutrition_facts') THEN
          ALTER TABLE products ADD COLUMN nutrition_facts TEXT;
        END IF;
        
        -- Add cooking_instructions column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cooking_instructions') THEN
          ALTER TABLE products ADD COLUMN cooking_instructions TEXT;
        END IF;
        
        -- Add weight_options column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight_options') THEN
          ALTER TABLE products ADD COLUMN weight_options TEXT[];
        END IF;
        
        -- Add reviews column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'reviews') THEN
          ALTER TABLE products ADD COLUMN reviews TEXT;
        END IF;
        
        -- Add weight_prices column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight_prices') THEN
          ALTER TABLE products ADD COLUMN weight_prices TEXT;
        END IF;
        
        -- Add rating column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'rating') THEN
          ALTER TABLE products ADD COLUMN rating DECIMAL DEFAULT 0;
        END IF;
        
        -- Add review_count column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'review_count') THEN
          ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT 0;
        END IF;
        
        -- Add featured column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'featured') THEN
          ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
      
      -- Add missing columns to orders table
      DO $$
      BEGIN
        -- Add tracking_id column to orders table if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_id') THEN
          ALTER TABLE orders ADD COLUMN tracking_id TEXT;
        END IF;
        
        -- Fix existing orders with NULL user_id
        UPDATE orders SET user_id = 1 WHERE user_id IS NULL;
      END $$;
    `);
    
    // Create a client for data operations
    const client = postgres(url, { ssl: 'require' });
    const db = drizzle(client);
    
    // Create admin user if it doesn't exist
    const adminUser = await db.select().from(users).where(eq(users.username, 'admin_millikit'));
    
    if (adminUser.length === 0) {
      console.log('Creating admin user...');
      await migrationDb.execute(`
        INSERT INTO users (username, password, email, name, role) 
        VALUES ('admin_millikit', 'the_millikit', 'admin@millikit.com', 'Admin', 'admin')
      `);
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
    
    // Check if we need to insert sample products
    const existingProducts = await db.select().from(products);
    
    if (existingProducts.length === 0) {
      console.log('Populating products table with sample data...');
      
      // Insert products in batches to avoid overwhelming the database
      for (const product of sampleProducts) {
        try {
          // Use parameterized queries with proper TypeScript null checking
          const imageGalleryArray = product.imageGallery || [];
          const weightOptionsArray = product.weightOptions || [];
          const reviewsStr = product.reviews || null;
          
          // Use raw SQL to avoid schema validation issues with a single SQL string
          const sql = `INSERT INTO products 
            (name, slug, description, short_description, price, compare_price, badge, 
            category, image_url, image_gallery, in_stock, stock_quantity, featured, 
            nutrition_facts, cooking_instructions, rating, review_count, weight_options, reviews) 
            VALUES 
            ('${product.name}', 
            '${product.slug}', 
            '${product.description.replace(/'/g, "''")}', 
            '${product.shortDescription?.replace(/'/g, "''")}', 
            ${product.price}, 
            ${product.comparePrice ? product.comparePrice : 'NULL'}, 
            ${product.badge ? `'${product.badge}'` : 'NULL'}, 
            '${product.category}', 
            '${product.imageUrl}', 
            ARRAY[${imageGalleryArray.map((url: string) => `'${url}'`).join(', ')}], 
            ${product.inStock}, 
            ${product.stockQuantity}, 
            ${product.featured}, 
            ${product.nutritionFacts ? `'${product.nutritionFacts.replace(/'/g, "''")}'` : 'NULL'}, 
            ${product.cookingInstructions ? `'${product.cookingInstructions.replace(/'/g, "''")}'` : 'NULL'}, 
            ${product.rating}, 
            ${product.reviewCount}, 
            ARRAY[${weightOptionsArray.map((opt: string) => `'${opt}'`).join(', ')}], 
            ${reviewsStr ? `'${reviewsStr.replace(/'/g, "''")}'` : 'NULL'}
            )`;
          
          await migrationDb.execute(sql);
        } catch (error) {
          console.error(`Error inserting product ${product.name}:`, error);
          // Continue with the next product even if this one fails
        }
      }
      
      console.log(`Added ${sampleProducts.length} sample products`);
    } else {
      console.log(`Database already has ${existingProducts.length} products`);
    }
    
    // Check if we need to create sample orders
    const existingOrders = await migrationDb.execute(`SELECT COUNT(*) FROM orders`);
    const orderCount = parseInt(existingOrders[0].count as string, 10);
    
    if (orderCount === 0 && existingProducts.length > 0) {
      console.log('Creating sample orders...');
      
      try {
        // Create a sample order
        const orderSql = `
          INSERT INTO orders (
            email, phone, status, order_number, total_amount, 
            subtotal_amount, tax_amount, shipping_amount, payment_method, 
            shipping_address, transaction_id, session_id
          ) VALUES (
            'customer@example.com', 
            '9876543210', 
            'processing', 
            'ORD-${Date.now()}', 
            '1250.00', 
            '1050.00', 
            '150.00', 
            '50.00', 
            'razorpay', 
            '123 Main St, Bangalore, Karnataka, India', 
            'txn_${Date.now()}', 
            'sess_${Date.now()}'
          ) RETURNING id`;
        
        const orderResult = await migrationDb.execute(orderSql);
        const orderId = orderResult[0].id;
        
        // Add order items for the sample order using existing products
        for (let i = 0; i < Math.min(2, existingProducts.length); i++) {
          const product = existingProducts[i];
          const quantity = i + 1;
          const subtotal = parseFloat(product.price as string) * quantity;
          
          const orderItemSql = `
            INSERT INTO order_items (
              name, price, product_id, quantity, 
              order_id, subtotal, meta_data
            ) VALUES (
              '${product.name.replace(/'/g, "''")}', 
              '${product.price}', 
              ${product.id}, 
              ${quantity}, 
              ${orderId}, 
              '${subtotal.toFixed(2)}',
              '{"selectedWeight": "${product.weightOptions ? product.weightOptions[0] : "500g"}"}'
            )`;
          
          await migrationDb.execute(orderItemSql);
        }
        
        // Add a second order with different status
        const orderSql2 = `
          INSERT INTO orders (
            email, phone, status, order_number, total_amount, 
            subtotal_amount, tax_amount, shipping_amount, payment_method, 
            shipping_address, transaction_id, session_id
          ) VALUES (
            'another@example.com', 
            '8765432109', 
            'pending', 
            'ORD-${Date.now() + 1}', 
            '750.00', 
            '650.00', 
            '70.00', 
            '30.00', 
            'razorpay', 
            '456 Park Ave, Chennai, Tamil Nadu, India', 
            'txn_${Date.now() + 1}', 
            'sess_${Date.now() + 1}'
          ) RETURNING id`;
        
        const orderResult2 = await migrationDb.execute(orderSql2);
        const orderId2 = orderResult2[0].id;
        
        // Add order items for the second order
        if (existingProducts.length > 0) {
          const product = existingProducts[0];
          const quantity = 3;
          const subtotal = parseFloat(product.price as string) * quantity;
          
          const orderItemSql = `
            INSERT INTO order_items (
              name, price, product_id, quantity, 
              order_id, subtotal, meta_data
            ) VALUES (
              '${product.name.replace(/'/g, "''")}', 
              '${product.price}', 
              ${product.id}, 
              ${quantity}, 
              ${orderId2}, 
              '${subtotal.toFixed(2)}',
              '{"selectedWeight": "${product.weightOptions ? product.weightOptions[0] : "500g"}"}'
            )`;
          
          await migrationDb.execute(orderItemSql);
        }
        
        console.log('Sample orders created successfully');
      } catch (error) {
        console.error('Error creating sample orders:', error);
        // Continue even if sample orders fail to be created
      }
    } else if (orderCount > 0) {
      console.log(`Database already has ${orderCount} orders`);
    }
    
    // Close the migration client
    await migrationClient.end();
    
    console.log('Database initialization complete');
    return { client, db };
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}