import { 
  users, type User, type InsertUser,
  products, type Product, type InsertProduct, type ProductReview,
  cartItems, type CartItem, type InsertCartItem,
  contacts, type Contact, type InsertContact,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  settings, type Setting, type InsertSetting
} from "@shared/schema";
import { IStorage } from "./storage";
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, like, ilike, desc, and, or, count, max, asc, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { PgTable } from 'drizzle-orm/pg-core';

/**
 * PostgreSQL implementation of the storage interface
 * Uses Drizzle ORM to interact with the database
 */
export class PostgreSQLStorage implements IStorage {
  private db!: ReturnType<typeof drizzle>; // Using ! to tell TypeScript this will be initialized
  private client!: ReturnType<typeof postgres>; // Using ! to tell TypeScript this will be initialized
  private connectionString: string;
  private maxRetries: number = 5;
  private retryDelay: number = 2000; // 2 seconds delay between retries

  constructor(connectionString: string) {
    console.log('Connecting to PostgreSQL database...');
    this.connectionString = connectionString;
    this.initConnection();
  }
  
  private initConnection() {
    try {
      // Create a Postgres client with native SSL support
      this.client = postgres(this.connectionString, { 
        ssl: 'require',
        max: 10, // connection pool size
        idle_timeout: 30,
        connect_timeout: 10,
        onnotice: () => {}, // ignore notices
        onparameter: () => {}, // ignore parameter updates
      });
      
      // Initialize Drizzle with the client
      this.db = drizzle(this.client);
      console.log('Database connection established successfully');
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  // Helper method to execute queries with auto-reconnection logic
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Check for common database connection errors
      const isConnectionError = error instanceof Error && (
        // PostgreSQL specific connection errors
        error.message.includes('terminating connection') ||
        error.message.includes('Connection terminated') ||
        error.message.includes('Connection closed') ||
        error.message.includes('connection lost') ||
        error.message.includes('could not connect') ||
        error.message.includes('timeout') ||
        // Serverless environment specific errors
        error.message.includes('socket hang up') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')
      );
      
      if (isConnectionError && retries > 0) {
        console.log(`Database connection lost. Reconnecting... (${retries} retries left)`);
        
        // Exponential backoff: increase delay with each retry
        const currentDelay = this.retryDelay * (this.maxRetries - retries + 1);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        
        try {
          // Close existing connection if possible
          try {
            if (this.client && typeof this.client.end === 'function') {
              await this.client.end({ timeout: 5 }).catch(e => console.log('Error closing previous connection:', e.message));
            }
          } catch (endError) {
            console.log('Error while attempting to close previous connection:', endError);
            // Continue even if closing fails
          }
          
          // Reinitialize the connection
          this.initConnection();
          console.log('Successfully reconnected to database');
          
          // Retry the operation
          return this.executeWithRetry(operation, retries - 1);
        } catch (reconnectError) {
          console.error('Failed to reconnect to database:', reconnectError);
          
          if (retries > 1) {
            console.log('Will try again after delay...');
            await new Promise(resolve => setTimeout(resolve, currentDelay * 2));
            return this.executeWithRetry(operation, retries - 1);
          }
          
          throw error; // Throw the original error if all reconnection attempts fail
        }
      }
      
      // For other errors or if we're out of retries, just throw the original error
      throw error;
    }
  }

  // Helper function to ensure reviews are properly serialized/deserialized
  private parseReviews(reviewsStr: string | null): ProductReview[] {
    if (!reviewsStr) return [];
    try {
      return JSON.parse(reviewsStr) as ProductReview[];
    } catch (error) {
      console.error('Error parsing reviews:', error);
      return [];
    }
  }

  // Helper function to stringify reviews for storage
  private stringifyReviews(reviews: ProductReview[]): string {
    return JSON.stringify(reviews);
  }

  /** 
   * User Operations
   */
  async getUser(id: number): Promise<User | undefined> {
    return this.executeWithRetry(async () => {
      const results = await this.db.select().from(users).where(eq(users.id, id));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.executeWithRetry(async () => {
      const results = await this.db.select().from(users).where(eq(users.email, username));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.executeWithRetry(async () => {
      const results = await this.db.select().from(users).where(eq(users.email, email));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeWithRetry(async () => {
      const newUser = await this.db.insert(users).values(user).returning();
      return newUser[0];
    });
  }

  async isAdmin(userId: number): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const user = await this.getUser(userId);
      return Boolean(user?.isAdmin);
    });
  }

  /** 
   * Product Operations
   */
  async getProducts(): Promise<Product[]> {
    return this.executeWithRetry(async () => {
      const results = await this.db.select().from(products);
      return results;
    });
  }

  async getProductById(id: number): Promise<Product | undefined> {
    return this.executeWithRetry(async () => {
      const results = await this.db.select().from(products).where(eq(products.id, id));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return this.executeWithRetry(async () => {
      const results = await this.db.select().from(products).where(eq(products.slug, slug));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.executeWithRetry(async () => {
      return await this.db.select().from(products).where(eq(products.category, category));
    });
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return this.executeWithRetry(async () => {
      return await this.db.select().from(products).where(eq(products.featured, true));
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.executeWithRetry(async () => {
      if (!query) {
        return this.getProducts();
      }
      
      // Search in name, description, and category
      return await this.db.select().from(products).where(
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.description, `%${query}%`), 
          ilike(products.category, `%${query}%`)
        )
      );
    });
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return this.executeWithRetry(async () => {
      console.log("Creating product with data:", product);
      const newProduct = await this.db.insert(products).values(product).returning();
      console.log("Product created successfully:", newProduct[0]);
      return newProduct[0];
    });
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    return this.executeWithRetry(async () => {
      console.log(`Updating product ${id} with data:`, product);
      const updated = await this.db
        .update(products)
        .set(product)
        .where(eq(products.id, id))
        .returning();
      
      if (updated.length > 0) {
        console.log("Product updated successfully:", updated[0]);
        return updated[0];
      }
      console.log("No product found to update with ID:", id);
      return undefined;
    });
  }

  async deleteProduct(id: number): Promise<void> {
    return this.executeWithRetry(async () => {
      try {
        console.log(`PostgreSQL: Starting product deletion process for ID ${id}`);
        
        // First, explicitly delete related cart items
        try {
          console.log(`PostgreSQL: Manually deleting related cart items for product ID ${id}`);
          const result = await this.db.delete(cartItems)
            .where(eq(cartItems.productId, id))
            .returning();
          console.log(`PostgreSQL: Successfully deleted ${result.length} cart items for product ID ${id}`);
        } catch (cartError) {
          console.error(`Warning: Error deleting cart items for product ${id}:`, cartError);
          // Continue with deletion even if cart items cleanup fails
        }
        
        // Second, explicitly delete related order items
        try {
          console.log(`PostgreSQL: Manually deleting related order items for product ID ${id}`);
          const result = await this.db.delete(orderItems)
            .where(eq(orderItems.productId, id))
            .returning();
          console.log(`PostgreSQL: Successfully deleted ${result.length} order items for product ID ${id}`);
        } catch (orderItemError) {
          console.error(`Warning: Error deleting order items for product ${id}:`, orderItemError);
          // Continue with deletion even if order items cleanup fails
        }
        
        // Finally, delete the product
        console.log(`PostgreSQL: Now deleting product ID ${id} directly`);
        const deleteResult = await this.db.delete(products)
          .where(eq(products.id, id))
          .returning({ id: products.id, name: products.name });
        
        if (deleteResult.length === 0) {
          console.error(`PostgreSQL: Product ID ${id} not found or already deleted`);
        } else {
          console.log(`PostgreSQL: Successfully deleted product: ${JSON.stringify(deleteResult[0])}`);
        }
      } catch (error) {
        console.error(`Error in PostgreSQL deleting product ${id}:`, error);
        throw new Error(`Failed to delete product ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /** 
   * Cart Operations
   */
  async getCartItems(sessionId: string): Promise<CartItem[]> {
    return this.executeWithRetry(async () => {
      try {
        // Try standard Drizzle ORM query first
        return await this.db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
      } catch (error) {
        console.error('Error fetching cart items with Drizzle:', error);
        
        // If query failed because of meta_data column, return empty array as fallback 
        // rather than trying to make another query that might also fail
        console.log('Returning empty cart items array due to schema mismatch');
        return [];
      }
    });
  }

  async getCartItemWithProduct(sessionId: string, productId: number, metaDataValue?: string): Promise<CartItem | undefined> {
    return this.executeWithRetry(async () => {
      try {
        console.log(`Searching for cart item with sessionId: ${sessionId}, productId: ${productId}, metaData: ${metaDataValue || 'none'}`);
        
        // Get all items that match the sessionId and productId
        const results = await this.db
          .select()
          .from(cartItems)
          .where(
            and(
              eq(cartItems.sessionId, sessionId),
              eq(cartItems.productId, productId)
            )
          );
          
        console.log(`Found ${results.length} items with matching sessionId and productId`);
          
        // If metaData is provided, we need to match on that too
        if (results.length > 0 && metaDataValue) {
          console.log(`Searching for cart item with metaData: ${metaDataValue} among ${results.length} items`);
          
          // Try to find a match based on metaData
          for (const item of results) {
            try {
              // If the raw values match exactly 
              if (item.metaData === metaDataValue) {
                console.log('Found matching item with exact metaData match');
                return item;
              }
              
              // Parse the metaData for more sophisticated matching
              if (item.metaData && metaDataValue) {
                try {
                  const itemMeta = JSON.parse(item.metaData);
                  const valueMeta = JSON.parse(metaDataValue);
                  
                  // Check if the selectedWeight values match
                  if (itemMeta.selectedWeight === valueMeta.selectedWeight) {
                    console.log(`Found matching item with parsed metaData. Weight: ${itemMeta.selectedWeight}`);
                    return item;
                  }
                } catch (parseError) {
                  console.error('Error parsing metaData JSON:', parseError);
                }
              }
            } catch (e) {
              console.error('Error comparing metaData:', e);
            }
          }
          
          // No match found
          console.log('No cart item with matching metaData found');
          return undefined; 
        }
        
        // If no metaData provided or no specific match needed, return the first item
        return results.length > 0 ? results[0] : undefined;
      } catch (error) {
        console.error('Error in getCartItemWithProduct:', error);
        return undefined;
      }
    });
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    return this.executeWithRetry(async () => {
      try {
        console.log('Adding cart item to database:', cartItem);
        
        // Set metaData to null if it's undefined to ensure it's stored correctly
        const itemToInsert = {
          ...cartItem,
          metaData: cartItem.metaData || null
        };
        
        // Insert the cart item with metaData included
        try {
          const newCartItem = await this.db.insert(cartItems).values(itemToInsert).returning();
          console.log('Successfully added cart item with metaData:', newCartItem[0]);
          return newCartItem[0];
        } catch (insertError) {
          console.error('Error adding to cart with standard insert:', insertError);
          
          // If Drizzle insert fails, try the fallback method of using SQL manually
          try {
            // First insert without metadata
            const { metaData, ...cartItemWithoutMeta } = cartItem;
            console.log('Falling back: adding cart item without metaData');
            
            const baseInsert = await this.db.insert(cartItems).values(cartItemWithoutMeta).returning();
            const insertedId = baseInsert[0].id;
            
            console.log('Successfully inserted base item with ID:', insertedId);
            
            // If we have metaData, do a separate update with the raw client
            if (cartItem.metaData) {
              try {
                console.log('Attempting separate update for metaData');
                // Use the db update method from drizzle instead of raw query
                await this.db.update(cartItems)
                  .set({ metaData: cartItem.metaData })
                  .where(eq(cartItems.id, insertedId));
                
                console.log('Successfully updated metaData');
              } catch (metaUpdateError) {
                console.error('Failed to update metaData:', metaUpdateError);
              }
            }
            
            // Get the updated record
            const updatedResult = await this.db.select().from(cartItems).where(eq(cartItems.id, insertedId));
            
            if (updatedResult.length > 0) {
              console.log('Returning updated cart item:', updatedResult[0]);
              return updatedResult[0];
            } else {
              console.log('Returning base item (could not fetch updated):', baseInsert[0]);
              return baseInsert[0];
            }
          } catch (fallbackError) {
            console.error('Complete fallback failure:', fallbackError);
            throw fallbackError;
          }
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        throw error;
      }
    });
  }
  
  // Helper method to map database row to CartItem
  private mapCartItem(row: any): CartItem {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      productId: row.product_id,
      quantity: row.quantity,
      createdAt: row.created_at || new Date(),
      metaData: row.meta_data
    };
  }
  
  // Utility method to check if a column exists in a table - always returns false in this implementation
  private async checkIfColumnExists(tableName: string, columnName: string): Promise<boolean> {
    // We're simplifying our implementation due to database structure differences
    // Always return false to force code to use the fallback without metaData
    console.log(`Assuming column ${columnName} does not exist in ${tableName} to avoid schema errors`);
    return false;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    return this.executeWithRetry(async () => {
      const updated = await this.db
        .update(cartItems)
        .set({ quantity })
        .where(eq(cartItems.id, id))
        .returning();
      
      return updated.length > 0 ? updated[0] : undefined;
    });
  }

  async removeFromCart(id: number): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.db.delete(cartItems).where(eq(cartItems.id, id));
    });
  }

  async clearCart(sessionId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
    });
  }

  async deleteCartItemsByProductId(productId: number): Promise<void> {
    return this.executeWithRetry(async () => {
      console.log(`PostgreSQL: Deleting cart items for product ID ${productId}`);
      await this.db.delete(cartItems).where(eq(cartItems.productId, productId));
    });
  }

  /** 
   * Contact Operations
   */
  async createContact(contact: InsertContact): Promise<Contact> {
    return this.executeWithRetry(async () => {
      const newContact = await this.db.insert(contacts).values(contact).returning();
      return newContact[0];
    });
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    return this.executeWithRetry(async () => {
      const result = await this.db
        .select()
        .from(contacts)
        .where(eq(contacts.id, id));
      
      return result.length > 0 ? result[0] : undefined;
    });
  }

  async getContacts(): Promise<Contact[]> {
    return this.executeWithRetry(async () => {
      return await this.db.select().from(contacts);
    });
  }

  /** 
   * Order Operations
   */
  async createOrder(order: InsertOrder): Promise<Order> {
    return this.executeWithRetry(async () => {
      console.log('PostgreSQL: Creating new order:', {
        orderNumber: order.orderNumber,
        email: order.email,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount
      });
      
      try {
        const newOrder = await this.db.insert(orders).values(order).returning();
        console.log('PostgreSQL: Successfully created order with ID:', newOrder[0].id);
        return newOrder[0];
      } catch (error) {
        console.error('PostgreSQL: Error creating order:', error);
        throw error;
      }
    });
  }
  async updateOrder(id: number, orderUpdate: Partial<Order>): Promise<Order> {
    return this.executeWithRetry(async () => {
      const updated = await this.db
        .update(orders)
        .set({ ...orderUpdate, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      
      if (updated.length === 0) {
        throw new Error(`Order with id ${id} not found`);
      }
      
      return updated[0];
    });
  }

  async getOrderById(id: number): Promise<Order | null> {
    return this.executeWithRetry(async () => {
      const results = await this.db.select().from(orders).where(eq(orders.id, id));
      return results.length > 0 ? results[0] : null;
    });
  }

  async getOrderByPaymentId(paymentId: string): Promise<Order | null> {
    return this.executeWithRetry(async () => {
      console.log(`PostgreSQL: Looking for order with payment ID: ${paymentId}`);
      try {
        const results = await this.db.select().from(orders).where(eq(orders.paymentId, paymentId));
        
        if (results.length > 0) {
          console.log(`PostgreSQL: Found order with ID ${results[0].id} for payment ID ${paymentId}`);
          return results[0];
        } else {
          console.log(`PostgreSQL: No order found with payment ID ${paymentId}`);
          
          // Log all order payment IDs for debugging
          const allOrders = await this.db.select({
            id: orders.id,
            paymentId: orders.paymentId,
            orderNumber: orders.orderNumber
          }).from(orders);
          
          console.log('PostgreSQL: Available orders and their payment IDs:');
          allOrders.forEach(order => {
            console.log(`Order #${order.id} (${order.orderNumber}): paymentId=${order.paymentId || 'null'}`);
          });
          
          return null;
        }
      } catch (error) {
        console.error(`PostgreSQL: Error finding order by payment ID ${paymentId}:`, error);
        return null;
      }
    });
  }

  async getOrdersBySessionId(sessionId: string): Promise<Order[]> {
    return this.executeWithRetry(async () => {
      return await this.db.select().from(orders).where(eq(orders.sessionId, sessionId));
    });
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    return this.executeWithRetry(async () => {
      return await this.db.select().from(orders).where(eq(orders.email, email));
    });
  }

  async getOrders(): Promise<Order[]> {
    return this.executeWithRetry(async () => {
      console.log('PostgreSQL: Fetching all orders from database');
      try {
        // Log connection string (with credentials masked)
        const connectionStringParts = this.connectionString.split('@');
        const maskedConnString = connectionStringParts.length > 1 ? 
          `***@${connectionStringParts[connectionStringParts.length - 1]}` : 
          '***masked***';
        console.log(`PostgreSQL: Using connection: ${maskedConnString}`);
        
        // Ensure DB connection is active
        if (!this.db || !this.client) {
          console.log('PostgreSQL: Recreating database connection');
          this.client = postgres(this.connectionString, {
            ssl: 'require',
            onnotice: () => {}, // ignore notices
            onparameter: () => {}, // ignore parameter updates
            max: 10, // connection pool size
            idle_timeout: 20, // seconds before connection is released
          });
          this.db = drizzle(this.client);
        }
        
        // Execute the query with explicit ordering
        console.log('PostgreSQL: Executing SELECT query on orders table');
        const results = await this.db
          .select()
          .from(orders)
          .orderBy(desc(orders.createdAt));
        
        console.log(`PostgreSQL: Successfully retrieved ${results.length} orders`);
        
        // Log sample order details for debugging
        if (results.length > 0) {
          console.log('PostgreSQL: First order details:', {
            id: results[0].id,
            orderNumber: results[0].orderNumber,
            status: results[0].status,
            email: results[0].email,
            paymentMethod: results[0].paymentMethod,
            createdAt: results[0].createdAt
          });
          
          // Log latest 3 orders for more detailed debugging
          console.log('PostgreSQL: Latest orders:');
          results.slice(0, 3).forEach((order, index) => {
            console.log(`Order #${index + 1}:`, {
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              createdAt: order.createdAt,
              email: order.email?.substring(0, 3) + '***' // Mask email for privacy
            });
          });
        } else {
          console.log('PostgreSQL: No orders found in database - checking if orders table exists');
          try {
            // Check if table exists and has structure we expect
            const tableCheck = await this.db.execute(sql`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = 'orders'
              );
            `);
            console.log('PostgreSQL: Orders table exists check result:', tableCheck);
            
            // Try a raw count query as a backup check
            const countCheck = await this.db.execute(sql`SELECT COUNT(*) FROM orders;`);
            console.log('PostgreSQL: Order count from raw SQL:', countCheck);
          } catch (tableError) {
            console.error('PostgreSQL: Error checking orders table:', tableError);
          }
        }
        
        return results;
      } catch (error) {
        console.error('PostgreSQL: Error fetching orders:', error);
        // Try a more direct approach if the ORM query failed
        try {
          console.log('PostgreSQL: Attempting fallback with raw SQL query');
          // Use the execute method instead of query
          const rawResults = await this.db.execute(sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;`);
          console.log(`PostgreSQL: Raw query returned ${rawResults.length} orders`);
          
          // Convert raw results to Order type
          const typedResults: Order[] = rawResults.map(row => ({
            id: Number(row.id),
            email: row.email as string | null,
            phone: row.phone as string | null,
            status: row.status as string,
            createdAt: row.created_at ? new Date(row.created_at as string) : null,
            updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
            userId: row.user_id ? Number(row.user_id) : null,
            sessionId: row.session_id as string | null,
            orderNumber: row.order_number as string,
            totalAmount: row.total_amount as string,
            subtotalAmount: row.subtotal_amount as string,
            taxAmount: row.tax_amount as string,
            shippingAmount: row.shipping_amount as string,
            discountAmount: row.discount_amount as string | null,
            paymentId: row.payment_id as string | null,
            paymentMethod: row.payment_method as string,
            paymentStatus: row.payment_status as string | null,
            transactionId: row.transaction_id as string | null,
            shippingAddress: row.shipping_address as string,
            billingAddress: row.billing_address as string | null,
            shippingMethod: row.shipping_method as string | null,
            notes: row.notes as string | null,
            couponCode: row.coupon_code as string | null
          }));
          
          console.log(`PostgreSQL: Converted ${typedResults.length} orders to typed results`);
          return typedResults;
        } catch (fallbackError) {
          console.error('PostgreSQL: Fallback query also failed:', fallbackError);
          // Return an empty array instead of throwing to prevent UI errors
          return [];
        }
      }
    }, this.maxRetries);
  }

  async getOrdersPaginated(page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    return this.executeWithRetry(async () => {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await this.db
        .select({ count: count() })
        .from(orders);
      
      const total = Number(countResult[0].count) || 0;
      
      // Get paginated orders
      const paginatedOrders = await this.db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);
      
      return {
        orders: paginatedOrders,
        total
      };
    });
  }
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    return this.executeWithRetry(async () => {
      const newOrderItem = await this.db.insert(orderItems).values(orderItem).returning();
      return newOrderItem[0];
    });
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return this.executeWithRetry(async () => {
      return await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    });
  }

  /** 
   * Settings Operations
   */
  async createSetting(setting: InsertSetting): Promise<Setting> {
    return this.executeWithRetry(async () => {
      const newSetting = await this.db.insert(settings).values(setting).returning();
      return newSetting[0];
    });
  }
  async updateSetting(key: string, settingUpdate: Partial<Setting>): Promise<Setting> {
    return this.executeWithRetry(async () => {
      const updated = await this.db
        .update(settings)
        .set({ ...settingUpdate, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      
      if (updated.length === 0) {
        throw new Error(`Setting with key ${key} not found`);
      }
      
      return updated[0];
    });
  }
  async deleteSetting(key: string): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const result = await this.db
        .delete(settings)
        .where(eq(settings.key, key))
        .returning();
      
      return result.length > 0;
    });
  }

  async getSetting(key: string): Promise<Setting | null> {
    return this.executeWithRetry(async () => {
      const results = await this.db.select().from(settings).where(eq(settings.key, key));
      return results.length > 0 ? results[0] : null;
    });
  }

  async getSettings(group?: string): Promise<Setting[]> {
    return this.executeWithRetry(async () => {
      if (group) {
        return await this.db.select().from(settings).where(eq(settings.group, group));
      }
      return await this.db.select().from(settings);
    });
  }

  /**
   * Delete an order and its associated order items
   */
  async deleteOrder(id: number): Promise<boolean> {
    try {
      console.log(`PostgreSQL: Attempting to delete order with ID ${id}`);
      
      // First, delete all order items associated with this order
      const deleteItemsResult = await this.executeWithRetry(async () => {
        const result = await this.db
          .delete(orderItems)
          .where(eq(orderItems.orderId, id));
        
        console.log(`PostgreSQL: Deleted ${result.count} order items for order ${id}`);
        return result;
      });

      // Then, delete the order itself
      const deleteOrderResult = await this.executeWithRetry(async () => {
        const result = await this.db
          .delete(orders)
          .where(eq(orders.id, id));
        
        console.log(`PostgreSQL: Order deletion result for ID ${id}: ${result.count} row(s) affected`);
        return result;
      });

      return deleteOrderResult.count > 0;
    } catch (error) {
      console.error(`PostgreSQL: Error deleting order ${id}:`, error);
      return false;
    }
  }
}