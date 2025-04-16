import { 
  users, type User, type InsertUser,
  products, type Product, type InsertProduct,
  cartItems, type CartItem, type InsertCartItem,
  contacts, type Contact, type InsertContact,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  settings, type Setting, type InsertSetting
} from "@shared/schema";
import { verifyToken } from './otpUtils';
import { PostgreSQLStorage } from './postgresql';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Try to load environment variables from .env file if not already loaded
try {
  if (fs.existsSync('.env') && !process.env.DATABASE_URL) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('Storage: Loaded environment variables from .env file');
  }
} catch (error) {
  console.error('Storage: Error loading .env file:', error);
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  isAdmin(userId: number): Promise<boolean>;

  // Product operations
  getProducts(): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Cart operations
  getCartItems(sessionId: string): Promise<CartItem[]>;
  getCartItemWithProduct(sessionId: string, productId: number, metaData?: string): Promise<CartItem | undefined>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<void>;
  clearCart(sessionId: string): Promise<void>;
  deleteCartItemsByProductId(productId: number): Promise<void>;

  // Contact operations
  createContact(contact: InsertContact): Promise<Contact>;
  getContactById(id: number): Promise<Contact | undefined>;
  getContacts(): Promise<Contact[]>;

  // Order management
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order>;
  getOrderById(id: number): Promise<Order | null>;
  getOrderByPaymentId(paymentId: string): Promise<Order | null>;
  getOrdersBySessionId(sessionId: string): Promise<Order[]>;
  getOrdersByEmail(email: string): Promise<Order[]>;
  getOrders(): Promise<Order[]>;
  getOrdersPaginated(page: number, limit: number): Promise<{ orders: Order[], total: number }>;
  deleteOrder(id: number): Promise<boolean>;
  
  // Order items
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  
  // Settings management
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, setting: Partial<Setting>): Promise<Setting>;
  deleteSetting(key: string): Promise<boolean>;
  getSetting(key: string): Promise<Setting | null>;
  getSettings(group?: string): Promise<Setting[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private cartItems: Map<number, CartItem>;
  private contacts: Map<number, Contact>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private settings: Map<string, Setting>;
  private userIdCounter: number;
  private productIdCounter: number;
  private cartItemIdCounter: number;
  private contactIdCounter: number;
  private orderIdCounter: number;
  private orderItemIdCounter: number;
  private settingIdCounter: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.cartItems = new Map();
    this.contacts = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.settings = new Map();
    this.productIdCounter = 1;
    this.cartItemIdCounter = 1;
    this.contactIdCounter = 1;
    this.orderIdCounter = 1;
    this.orderItemIdCounter = 1;
    this.settingIdCounter = 1;
    
    // Create a predefined admin user with ID 1
    // This is the only admin user allowed in the system
    const adminUser: User = {
      id: 1,
      username: "admin_millikit",
      password: "the_millikit",
      name: null,
      email: null,
      phone: null,
      address: null,
      otpSecret: null,
      otpEnabled: false,
      isAdmin: true
    };
    
    // Set the admin user directly in the map with ID 1
    this.users.set(1, adminUser);
    console.log("Predefined admin user created with ID: 1");
    
    // Start user ID counter at 2 to preserve admin as ID 1
    this.userIdCounter = 2;

    // Initialize with some sample products
    this.initProducts();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id,
      name: insertUser.name || null,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      address: insertUser.address || null,
      otpSecret: null,
      otpEnabled: false,
      isAdmin: false
    };
    this.users.set(id, user);
    return user;
  }
  
  async isAdmin(userId: number): Promise<boolean> {
    // Check if user exists and has isAdmin flag set to true
    const user = this.users.get(userId);
    return user ? Boolean(user.isAdmin) : false;
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductById(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(
      (product) => product.slug === slug
    );
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.category === category
    );
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.featured
    );
  }

  async searchProducts(query: string): Promise<Product[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.products.values()).filter(
      (product) => 
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.description.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery)
    );
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const slug = product.slug || product.name.toLowerCase().replace(/\s+/g, '-');
    const newProduct: Product = {
      ...product,
      id,
      slug,
      shortDescription: product.shortDescription || null,
      comparePrice: product.comparePrice || null,
      badge: product.badge || null,
      imageGallery: product.imageGallery || [product.imageUrl],
      inStock: product.inStock !== undefined ? product.inStock : true,
      stockQuantity: product.stockQuantity || 0,
      featured: product.featured || false,
      nutritionFacts: product.nutritionFacts || null,
      cookingInstructions: product.cookingInstructions || null,
      rating: product.rating || null,
      reviewCount: product.reviewCount || 0,
      reviews: product.reviews || null,
      weightOptions: product.weightOptions || [],
      createdAt: new Date()
    };
    this.products.set(id, newProduct);
    return newProduct;
  }
  
  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) return undefined;
    
    const updatedProduct: Product = {
      ...existingProduct,
      ...product,
      // Ensure required fields maintain their values
      id: existingProduct.id,
      slug: product.slug || existingProduct.slug,
      createdAt: existingProduct.createdAt // Ensure createdAt is preserved
    };
    
    // Update image gallery if main image changed
    if (product.imageUrl && !product.imageGallery) {
      const gallery = [...(existingProduct.imageGallery || [])];
      // Replace first image or add if empty
      if (gallery.length > 0) {
        gallery[0] = product.imageUrl;
      } else {
        gallery.push(product.imageUrl);
      }
      updatedProduct.imageGallery = gallery;
    }
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<void> {
    try {
      // Simulate CASCADE delete behavior - delete all cart items for this product
      console.log(`MemStorage: Deleting product ID ${id} with simulated CASCADE behavior`);
      await this.deleteCartItemsByProductId(id);
      
      // Then delete the product
      this.products.delete(id);
      console.log(`MemStorage: Successfully deleted product ID ${id} and its related items`);
    } catch (error) {
      console.error(`Error in MemStorage deleting product ${id}:`, error);
      throw error;
    }
  }

  // Cart operations
  async getCartItems(sessionId: string): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(
      (item) => item.sessionId === sessionId
    );
  }

  async getCartItemWithProduct(sessionId: string, productId: number, metaData?: string): Promise<CartItem | undefined> {
    // If no metaData is provided, find any item with the matching sessionId and productId
    if (!metaData) {
      return Array.from(this.cartItems.values()).find(
        (item) => item.sessionId === sessionId && item.productId === productId
      );
    }
    
    // If metaData is provided, try to find a match with the exact metaData or parse and compare
    return Array.from(this.cartItems.values()).find(item => {
      // First check: exact match
      if (item.sessionId === sessionId && item.productId === productId && item.metaData === metaData) {
        return true;
      }
      
      // Second check: comparing parsed values - specifically looking for matching selectedWeight
      try {
        if (item.sessionId === sessionId && item.productId === productId && item.metaData && metaData) {
          const itemMeta = JSON.parse(item.metaData);
          const valueMeta = JSON.parse(metaData);
          if (itemMeta.selectedWeight === valueMeta.selectedWeight) {
            return true;
          }
        }
      } catch (e) {
        console.error("Error parsing metaData in MemStorage:", e);
      }
      
      return false;
    });
  }

  async addToCart(insertCartItem: InsertCartItem): Promise<CartItem> {
    const id = this.cartItemIdCounter++;
    const now = new Date();
    const cartItem: CartItem = { 
      ...insertCartItem, 
      id, 
      createdAt: now,
      userId: insertCartItem.userId || null,
      sessionId: insertCartItem.sessionId || null,
      quantity: insertCartItem.quantity || 1
    };
    this.cartItems.set(id, cartItem);
    return cartItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const cartItem = this.cartItems.get(id);
    if (!cartItem) return undefined;

    const updatedItem: CartItem = { ...cartItem, quantity };
    this.cartItems.set(id, updatedItem);
    return updatedItem;
  }

  async removeFromCart(id: number): Promise<void> {
    this.cartItems.delete(id);
  }

  async clearCart(sessionId: string): Promise<void> {
    Array.from(this.cartItems.entries())
      .filter(([_, item]) => item.sessionId === sessionId)
      .forEach(([id, _]) => this.cartItems.delete(id));
  }

  async deleteCartItemsByProductId(productId: number): Promise<void> {
    Array.from(this.cartItems.entries())
      .filter(([_, item]) => item.productId === productId)
      .forEach(([id, _]) => {
        console.log(`Deleting cart item ${id} associated with product ${productId}`);
        this.cartItems.delete(id);
      });
  }

  // Contact operations
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const now = new Date();
    const contact: Contact = { ...insertContact, id, createdAt: now };
    this.contacts.set(id, contact);
    return contact;
  }

  // Order management
  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id) || undefined;
  }

  async getOrdersBySessionId(sessionId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.sessionId === sessionId);
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.email === email);
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrdersPaginated(page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    const allOrders = Array.from(this.orders.values());
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedOrders = allOrders.slice(startIndex, endIndex);
    
    return {
      orders: paginatedOrders,
      total: allOrders.length
    };
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const newOrder: Order = {
      id,
      email: order.email || null,
      phone: order.phone || null,
      status: order.status || "pending",
      createdAt: new Date(),
      updatedAt: null,
      userId: order.userId || null,
      sessionId: order.sessionId || null,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      subtotalAmount: order.subtotalAmount,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      discountAmount: order.discountAmount || "0",
      paymentId: order.paymentId || null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus || "pending",
      transactionId: order.transactionId || null,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress || null,
      shippingMethod: order.shippingMethod || "standard",
      notes: order.notes || null,
      couponCode: order.couponCode || null
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    const updatedOrder: Order = {
      ...existingOrder,
      ...order,
      updatedAt: new Date()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Order items
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemIdCounter++;
    const newOrderItem: OrderItem = {
      id,
      name: orderItem.name,
      price: orderItem.price,
      createdAt: new Date(),
      productId: orderItem.productId,
      quantity: orderItem.quantity,
      metaData: orderItem.metaData || null,
      orderId: orderItem.orderId,
      subtotal: orderItem.subtotal,
      weight: orderItem.weight || null
    };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }

  // Settings management
  async getSetting(key: string): Promise<Setting | null> {
    return this.settings.get(key) || null;
  }

  async getSettings(group?: string): Promise<Setting[]> {
    const allSettings = Array.from(this.settings.values());
    if (group) {
      return allSettings.filter(s => s.group === group);
    }
    return allSettings;
  }

  async createSetting(setting: InsertSetting): Promise<Setting> {
    const existingSetting = await this.getSetting(setting.key);
    if (existingSetting) {
      throw new Error(`Setting with key ${setting.key} already exists`);
    }
    
    const id = this.settingIdCounter++;
    const newSetting: Setting = {
      id,
      key: setting.key,
      value: setting.value,
      description: setting.description || null,
      createdAt: new Date(),
      updatedAt: null,
      group: setting.group || null
    };
    
    this.settings.set(setting.key, newSetting);
    return newSetting;
  }

  async updateSetting(key: string, setting: Partial<Setting>): Promise<Setting> {
    const existingSetting = this.settings.get(key);
    if (!existingSetting) {
      throw new Error(`Setting with key ${key} not found`);
    }
    
    const updatedSetting: Setting = {
      ...existingSetting,
      ...setting,
      updatedAt: new Date()
    };
    
    this.settings.set(key, updatedSetting);
    return updatedSetting;
  }

  async deleteSetting(key: string): Promise<boolean> {
    return this.settings.delete(key);
  }
  
  /**
   * Delete an order and its associated order items
   */
  async deleteOrder(id: number): Promise<boolean> {
    try {
      console.log(`MemStorage: Attempting to delete order with ID ${id}`);
      if (!this.orders.has(id)) {
        console.log(`MemStorage: Order ID ${id} not found`);
        return false;
      }
      
      // First, remove all order items associated with this order
      const deletedItems = Array.from(this.orderItems.entries())
        .filter(([_, item]) => item.orderId === id)
        .map(([itemId, _]) => {
          console.log(`MemStorage: Deleting order item ${itemId} for order ${id}`);
          return this.orderItems.delete(itemId);
        });
      
      console.log(`MemStorage: Deleted ${deletedItems.length} order items for order ${id}`);
      
      // Then, delete the order itself
      const result = this.orders.delete(id);
      console.log(`MemStorage: Order deletion result for ID ${id}: ${result}`);
      
      return result;
    } catch (error) {
      console.error(`MemStorage: Error deleting order ${id}:`, error);
      return false;
    }
  }

  async updateOrderStatus(orderId: number, status: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    order.status = status;
    order.updatedAt = new Date();
    return true;
  }

  async updateOrderShippingDetails(
    orderId: number, 
    trackingId?: string
  ): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    order.updatedAt = new Date();
    order.status = 'completed';
    
    if (trackingId) {
      order.trackingId = trackingId;
    }
    
    return true;
  }
  
  async testConnection(): Promise<boolean> {
    // Memory storage is always connected
    return true;
  }

  // Order management
  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const newOrder: Order = {
      id,
      email: order.email || null,
      phone: order.phone || null,
      status: order.status || "pending",
      createdAt: new Date(),
      updatedAt: null,
      userId: order.userId || null,
      sessionId: order.sessionId || null,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      subtotalAmount: order.subtotalAmount,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      discountAmount: order.discountAmount || "0",
      paymentId: order.paymentId || null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus || "pending",
      transactionId: order.transactionId || null,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress || null,
      shippingMethod: order.shippingMethod || "standard",
      notes: order.notes || null,
      couponCode: order.couponCode || null
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }
  
  async updateOrder(id: number, order: Partial<Order>): Promise<Order> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    const updatedOrder: Order = {
      ...existingOrder,
      ...order,
      updatedAt: new Date()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  async getOrderById(id: number): Promise<Order | null> {
    return this.orders.get(id) || null;
  }
  
  async getOrderByPaymentId(paymentId: string): Promise<Order | null> {
    const order = Array.from(this.orders.values()).find(o => o.paymentId === paymentId);
    return order || null;
  }
  
  async getOrdersBySessionId(sessionId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.sessionId === sessionId);
  }
  
  async getOrdersByEmail(email: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.email === email);
  }
  
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }
  
  async getOrdersPaginated(page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    const allOrders = Array.from(this.orders.values());
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedOrders = allOrders.slice(startIndex, endIndex);
    
    return {
      orders: paginatedOrders,
      total: allOrders.length
    };
  }
  
  // Order items
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemIdCounter++;
    const newOrderItem: OrderItem = {
      id,
      name: orderItem.name,
      price: orderItem.price,
      createdAt: new Date(),
      productId: orderItem.productId,
      quantity: orderItem.quantity,
      metaData: orderItem.metaData || null,
      orderId: orderItem.orderId,
      subtotal: orderItem.subtotal,
      weight: orderItem.weight || null
    };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }
  
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
  }
  
  // Settings management
  async createSetting(setting: InsertSetting): Promise<Setting> {
    const existingSetting = await this.getSetting(setting.key);
    if (existingSetting) {
      throw new Error(`Setting with key ${setting.key} already exists`);
    }
    
    const id = this.settingIdCounter++;
    const newSetting: Setting = {
      id,
      key: setting.key,
      value: setting.value,
      description: setting.description || null,
      createdAt: new Date(),
      updatedAt: null,
      group: setting.group || null
    };
    
    this.settings.set(setting.key, newSetting);
    return newSetting;
  }
  
  async updateSetting(key: string, setting: Partial<Setting>): Promise<Setting> {
    const existingSetting = this.settings.get(key);
    if (!existingSetting) {
      throw new Error(`Setting with key ${key} not found`);
    }
    
    const updatedSetting: Setting = {
      ...existingSetting,
      ...setting,
      updatedAt: new Date()
    };
    
    this.settings.set(key, updatedSetting);
    return updatedSetting;
  }
  
  async deleteSetting(key: string): Promise<boolean> {
    return this.settings.delete(key);
  }
  
  async getSetting(key: string): Promise<Setting | null> {
    return this.settings.get(key) || null;
  }
  
  async getSettings(group?: string): Promise<Setting[]> {
    const allSettings = Array.from(this.settings.values());
    if (group) {
      return allSettings.filter(s => s.group === group);
    }
    return allSettings;
  }

  // Order management
  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const newOrder: Order = {
      id,
      email: order.email || null,
      phone: order.phone || null,
      status: order.status || "pending",
      createdAt: new Date(),
      updatedAt: null,
      userId: order.userId || null,
      sessionId: order.sessionId || null,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      subtotalAmount: order.subtotalAmount,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      discountAmount: order.discountAmount || "0",
      paymentId: order.paymentId || null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus || "pending",
      transactionId: order.transactionId || null,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress || null,
      shippingMethod: order.shippingMethod || "standard",
      notes: order.notes || null,
      couponCode: order.couponCode || null
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }
  
  async updateOrder(id: number, order: Partial<Order>): Promise<Order> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    const updatedOrder: Order = {
      ...existingOrder,
      ...order,
      updatedAt: new Date()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  async getOrderById(id: number): Promise<Order | null> {
    return this.orders.get(id) || null;
  }
  
  async getOrderByPaymentId(paymentId: string): Promise<Order | null> {
    const order = Array.from(this.orders.values()).find(o => o.paymentId === paymentId);
    return order || null;
  }
  
  async getOrdersBySessionId(sessionId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.sessionId === sessionId);
  }
  
  async getOrdersByEmail(email: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.email === email);
  }
  
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }
  
  async getOrdersPaginated(page: number, limit: number): Promise<{ orders: Order[], total: number }> {
    const allOrders = Array.from(this.orders.values());
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedOrders = allOrders.slice(startIndex, endIndex);
    
    return {
      orders: paginatedOrders,
      total: allOrders.length
    };
  }
  
  // Order items
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemIdCounter++;
    const newOrderItem: OrderItem = {
      id,
      name: orderItem.name,
      price: orderItem.price,
      createdAt: new Date(),
      productId: orderItem.productId,
      quantity: orderItem.quantity,
      metaData: orderItem.metaData || null,
      orderId: orderItem.orderId,
      subtotal: orderItem.subtotal,
      weight: orderItem.weight || null
    };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }
  
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
  }
  
  // Settings management
  async createSetting(setting: InsertSetting): Promise<Setting> {
    const existingSetting = await this.getSetting(setting.key);
    if (existingSetting) {
      throw new Error(`Setting with key ${setting.key} already exists`);
    }
    
    const id = this.settingIdCounter++;
    const newSetting: Setting = {
      id,
      key: setting.key,
      value: setting.value,
      description: setting.description || null,
      createdAt: new Date(),
      updatedAt: null,
      group: setting.group || null
    };
    
    this.settings.set(setting.key, newSetting);
    return newSetting;
  }
  
  async updateSetting(key: string, setting: Partial<Setting>): Promise<Setting> {
    const existingSetting = this.settings.get(key);
    if (!existingSetting) {
      throw new Error(`Setting with key ${key} not found`);
    }
    
    const updatedSetting: Setting = {
      ...existingSetting,
      ...setting,
      updatedAt: new Date()
    };
    
    this.settings.set(key, updatedSetting);
    return updatedSetting;
  }
  
  async deleteSetting(key: string): Promise<boolean> {
    return this.settings.delete(key);
  }
  
  async getSetting(key: string): Promise<Setting | null> {
    return this.settings.get(key) || null;
  }
  
  async getSettings(group?: string): Promise<Setting[]> {
    const allSettings = Array.from(this.settings.values());
    if (group) {
      return allSettings.filter(s => s.group === group);
    }
    return allSettings;
  }

  // Initialize products
  private initProducts() {
    const products: Product[] = [
      {
        id: this.productIdCounter++,
        name: "Foxtail Millet",
        slug: "foxtail-millet",
        description: "Foxtail millet (தினை) is one of the oldest cultivated millet species, and it continues to be an important crop in many parts of India. Our premium foxtail millet is grown organically in the fertile soils of Tamil Nadu with traditional farming methods. Foxtail millet is rich in complex carbohydrates and has a lower glycemic index compared to rice or wheat. It's an excellent choice for those managing diabetes or looking to maintain stable blood sugar levels.",
        shortDescription: "Premium quality organic foxtail millet grown in the fertile soils of Tamil Nadu.",
        price: "299",
        comparePrice: "349",
        badge: "Organic",
        category: "organic",
        imageUrl: "https://images.pexels.com/photos/7511774/pexels-photo-7511774.jpeg",
        imageGallery: [
          "https://images.pexels.com/photos/7511774/pexels-photo-7511774.jpeg",
          "https://images.pexels.com/photos/7511778/pexels-photo-7511778.jpeg",
          "https://images.pexels.com/photos/7511753/pexels-photo-7511753.jpeg",
          "https://images.pexels.com/photos/7511768/pexels-photo-7511768.jpeg"
        ],
        inStock: true,
        stockQuantity: 24,
        featured: true,
        nutritionFacts: JSON.stringify({
          servingSize: "100g",
          calories: 351,
          totalFat: 4.0,
          saturatedFat: 0.7,
          cholesterol: 0,
          sodium: 5,
          totalCarbohydrate: 63.2,
          dietaryFiber: 8.5,
          sugars: 0.6,
          protein: 11.2,
          vitamins: {
            iron: "3.0mg (16% DV)",
            calcium: "31mg (3% DV)",
            magnesium: "81mg (20% DV)",
            phosphorus: "290mg (29% DV)",
            potassium: "250mg (7% DV)",
            zinc: "2.4mg (16% DV)"
          }
        }),
        cookingInstructions: "Rinse 1 cup of foxtail millet under cold water until the water runs clear. In a pot, add 2.5 cups of water and the rinsed millet. Bring to a boil, then reduce heat to low and cover with a lid. Simmer for 15-20 minutes or until all the water is absorbed and the millet is tender. Remove from heat and let it sit, covered, for 5 minutes. Fluff with a fork before serving.",
        rating: "4.8",
        reviewCount: 42,
        weightOptions: ["250g", "500g", "1kg"],
        reviews: JSON.stringify([
          {
            id: "r1",
            name: "Ananya Sharma",
            avatar: "https://i.pravatar.cc/150?img=32",
            date: "2023-12-15",
            rating: 5,
            comment: "Excellent quality foxtail millet! The packaging was great and the millet cooks perfectly. I've been using it for breakfast porridge and love the nutty flavor.",
            helpfulCount: 12
          },
          {
            id: "r2",
            name: "Raj Patel",
            avatar: "https://i.pravatar.cc/150?img=68",
            date: "2023-11-22",
            rating: 4,
            comment: "Very good product. I've switched from rice to this millet and noticed better digestion. Would recommend for anyone looking for healthier alternatives.",
            helpfulCount: 8
          }
        ]),
        createdAt: new Date()
      },
      {
        id: this.productIdCounter++,
        name: "Pearl Millet",
        slug: "pearl-millet",
        description: "Pearl millet (Bajra) is highly nutritious and one of the most drought-resistant crops. Our organic pearl millet is carefully sourced and processed to retain its nutritional benefits.",
        shortDescription: "Organic pearl millet (Bajra)",
        price: "249",
        comparePrice: "299",
        badge: "Best Seller",
        category: "organic",
        imageUrl: "https://images.pexels.com/photos/7511729/pexels-photo-7511729.jpeg",
        imageGallery: [
          "https://images.pexels.com/photos/7511729/pexels-photo-7511729.jpeg"
        ],
        inStock: true,
        stockQuantity: 15,
        featured: true,
        nutritionFacts: null,
        cookingInstructions: null,
        rating: "4.6",
        reviewCount: 28,
        weightOptions: ["500g", "1kg"],
        reviews: null,
        createdAt: new Date()
      },
      {
        id: this.productIdCounter++,
        name: "Finger Millet",
        slug: "finger-millet",
        description: "Finger millet (Ragi) is rich in calcium and protein. It helps in strengthening bones and is ideal for growing children and the elderly.",
        shortDescription: "Fresh finger millet (Ragi)",
        price: "279",
        comparePrice: "329",
        badge: null,
        category: "organic",
        imageUrl: "https://images.pexels.com/photos/7511761/pexels-photo-7511761.jpeg",
        imageGallery: [
          "https://images.pexels.com/photos/7511761/pexels-photo-7511761.jpeg"
        ],
        inStock: true,
        stockQuantity: 18,
        featured: true,
        nutritionFacts: null,
        cookingInstructions: null,
        rating: "4.5",
        reviewCount: 32,
        weightOptions: ["250g", "500g", "750g"],
        reviews: null,
        createdAt: new Date()
      },
      {
        id: this.productIdCounter++,
        name: "Little Millet",
        slug: "little-millet",
        description: "Little millet (Samai) is a good source of protein and minerals. It helps in controlling blood sugar levels and aids in digestion.",
        shortDescription: "Organic little millet (Samai)",
        price: "319",
        comparePrice: null,
        badge: "New",
        category: "organic",
        imageUrl: "https://images.pexels.com/photos/7511771/pexels-photo-7511771.jpeg",
        imageGallery: [
          "https://images.pexels.com/photos/7511771/pexels-photo-7511771.jpeg"
        ],
        inStock: true,
        stockQuantity: 22,
        featured: false,
        nutritionFacts: null,
        cookingInstructions: null,
        rating: "4.3",
        reviewCount: 18,
        weightOptions: ["250g", "500g"],
        reviews: null,
        createdAt: new Date()
      },
      {
        id: this.productIdCounter++,
        name: "Millet Mix",
        slug: "millet-mix",
        description: "A nutritious blend of different millets that provides a balanced mix of nutrients. Perfect for daily consumption.",
        shortDescription: "Mixed millet blend",
        price: "349",
        comparePrice: "399",
        badge: null,
        category: "mixed",
        imageUrl: "https://images.pexels.com/photos/7511751/pexels-photo-7511751.jpeg",
        imageGallery: [
          "https://images.pexels.com/photos/7511751/pexels-photo-7511751.jpeg"
        ],
        inStock: true,
        stockQuantity: 10,
        featured: false,
        nutritionFacts: null,
        cookingInstructions: null,
        rating: "4.2",
        reviewCount: 15,
        weightOptions: ["500g", "1kg"],
        reviews: null,
        createdAt: new Date()
      },
      {
        id: this.productIdCounter++,
        name: "Barnyard Millet",
        slug: "barnyard-millet",
        description: "Barnyard millet is high in fiber and iron. It helps in controlling diabetes and maintaining heart health.",
        shortDescription: "Organic barnyard millet",
        price: "269",
        comparePrice: null,
        badge: null,
        category: "organic",
        imageUrl: "https://images.pexels.com/photos/7511756/pexels-photo-7511756.jpeg",
        imageGallery: [
          "https://images.pexels.com/photos/7511756/pexels-photo-7511756.jpeg"
        ],
        inStock: true,
        stockQuantity: 12,
        featured: false,
        nutritionFacts: null,
        cookingInstructions: null,
        rating: "4.0",
        reviewCount: 12,
        weightOptions: ["250g", "500g"],
        reviews: null,
        createdAt: new Date()
      },
      {
        id: this.productIdCounter++,
        name: "Millet Porridge Mix",
        slug: "millet-porridge-mix",
        description: "A healthy breakfast option made with a mix of millets and essential nutrients. Easy to prepare and delicious.",
        shortDescription: "Ready-to-cook millet porridge mix",
        price: "379",
        comparePrice: "429",
        badge: "Special",
        category: "specialty",
        imageUrl: "https://images.pexels.com/photos/7511760/pexels-photo-7511760.jpeg",
        imageGallery: [
          "https://images.pexels.com/photos/7511760/pexels-photo-7511760.jpeg"
        ],
        inStock: true,
        stockQuantity: 7,
        featured: false,
        nutritionFacts: null,
        cookingInstructions: null,
        rating: "4.7",
        reviewCount: 24,
        weightOptions: ["250g", "400g"],
        reviews: null,
        createdAt: new Date()
      },
      {
        id: this.productIdCounter++,
        name: "Millet Flour",
        slug: "millet-flour",
        description: "Fine millet flour perfect for making rotis, dosas, and other recipes. Gluten-free and nutritious.",
        shortDescription: "Stone-ground millet flour",
        price: "259",
        comparePrice: "299",
        badge: null,
        category: "specialty",
        imageUrl: "https://images.pexels.com/photos/7511768/pexels-photo-7511768.jpeg",
        imageGallery: [
          "https://images.pexels.com/photos/7511768/pexels-photo-7511768.jpeg"
        ],
        inStock: true,
        stockQuantity: 20,
        featured: false,
        nutritionFacts: null,
        cookingInstructions: null,
        rating: "4.4",
        reviewCount: 19,
        weightOptions: ["250g", "500g", "1kg"],
        reviews: null,
        createdAt: new Date()
      }
    ];

    products.forEach(product => {
      this.products.set(product.id, product);
    });
  }
}

// Determine which storage implementation to use
// Use PostgreSQL in production and when DATABASE_URL is available
// Otherwise, fall back to in-memory storage for development
let storage: IStorage;

// Initialize storage with default implementation
if (process.env.DATABASE_URL) {
  console.log('Using PostgreSQL storage implementation with DATABASE_URL');
  storage = new PostgreSQLStorage(process.env.DATABASE_URL);
} else {
  console.log('DATABASE_URL not found, using in-memory storage implementation');
  storage = new MemStorage();
}

// Function to set the storage implementation (useful for serverless environments)
export function setStorage(newStorage: IStorage): void {
  storage = newStorage;
  console.log('Storage implementation updated');
}

export { storage };
