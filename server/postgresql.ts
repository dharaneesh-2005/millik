import { 
  users, type User, type InsertUser,
  products, type Product, type InsertProduct, type ProductReview,
  cartItems, type CartItem, type InsertCartItem,
  contacts, type Contact, type InsertContact
} from "@shared/schema";
import { IStorage } from "./storage";
import { verifyToken } from './otpUtils';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, like, ilike, desc, and, or, count, max, asc } from 'drizzle-orm';
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
      const results = await this.db.select().from(users).where(eq(users.username, username));
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
      return user?.isAdmin || false;
    });
  }

  async enableOtp(userId: number, secret: string): Promise<User | undefined> {
    return this.executeWithRetry(async () => {
      const updated = await this.db
        .update(users)
        .set({ otpSecret: secret, otpEnabled: true })
        .where(eq(users.id, userId))
        .returning();
      
      return updated.length > 0 ? updated[0] : undefined;
    });
  }

  async verifyOtp(userId: number, token: string): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const user = await this.getUser(userId);
      if (!user || !user.otpEnabled || !user.otpSecret) {
        return false;
      }
      
      return verifyToken(token, user.otpSecret);
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
      await this.db.delete(products).where(eq(products.id, id));
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

  /** 
   * Contact Operations
   */
  async createContact(contact: InsertContact): Promise<Contact> {
    return this.executeWithRetry(async () => {
      const newContact = await this.db.insert(contacts).values(contact).returning();
      return newContact[0];
    });
  }

  async getContacts(): Promise<Contact[]> {
    return this.executeWithRetry(async () => {
      return await this.db.select().from(contacts);
    });
  }
}