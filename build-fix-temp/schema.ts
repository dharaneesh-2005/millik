import { 
  pgTable, 
  pgEnum, 
  serial, 
  text, 
  varchar, 
  integer,
  decimal, 
  timestamp, 
  uniqueIndex, 
  boolean,
  primaryKey,
  jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Order status enum
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "failed"
]);

// Payment status enum
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded"
]);

// User role enum
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "customer"
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").unique().notNull(),
    hashedPassword: text("hashed_password").notNull(),
    name: text("name").notNull(),
    role: userRoleEnum("role").default("customer").notNull(),
    username: text("username").unique(),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export const insertUserSchema = createInsertSchema(users);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  badge: text("badge"),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  imageGallery: text("image_gallery").array(),
  inStock: boolean("in_stock").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  featured: boolean("featured").default(false),
  nutritionFacts: text("nutrition_facts"),
  cookingInstructions: text("cooking_instructions"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  weightOptions: text("weight_options").array(),
  weightPrices: text("weight_prices"), // JSON string to store weight-price mappings
  createdAt: timestamp("created_at").defaultNow(),
  reviews: text("reviews"),
});

export interface ProductReview {
  id: string;
  name: string;
  avatar?: string;
  date: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  sessionId?: string; // Session ID to identify who submitted the review
}

export interface WeightPrice {
  [weight: string]: string; // Maps weight (e.g., "500g") to price as string (e.g., "180.00")
}

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"),
  productId: integer("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  metaData: text("meta_data"),  // Store selected weight and other product options
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Admin-specific types
export interface UserWithRole extends User {
  isAdmin: boolean;
}

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }).notNull().default(1),
  sessionId: varchar("session_id", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  status: varchar("status", { length: 255 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  orderNumber: varchar("order_number", { length: 255 }),
  totalAmount: varchar("total_amount", { length: 255 }).notNull(),
  subtotalAmount: varchar("subtotal_amount", { length: 255 }),
  taxAmount: varchar("tax_amount", { length: 255 }),
  shippingAmount: varchar("shipping_amount", { length: 255 }),
  discountAmount: varchar("discount_amount", { length: 255 }),
  paymentId: varchar("payment_id", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 255 }),
  paymentStatus: varchar("payment_status", { length: 255 }),
  transactionId: varchar("transaction_id", { length: 255 }),
  shippingAddress: varchar("shipping_address", { length: 1000 }),
  billingAddress: varchar("billing_address", { length: 1000 }),
  billingDetails: jsonb("billing_details"),
  shippingDetails: jsonb("shipping_details"),
  shippingMethod: varchar("shipping_method", { length: 255 }),
  notes: varchar("notes", { length: 1000 }),
  couponCode: varchar("coupon_code", { length: 255 }),
  isShipped: boolean("is_shipped").default(false),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  shippedAt: timestamp("shipped_at"),
});

export const insertOrderSchema = createInsertSchema(orders, {
  billingDetails: z.record(z.string(), z.any()),
  shippingDetails: z.record(z.string(), z.any()),
}).partial({
  orderNumber: true,
  email: true,
  phone: true,
  paymentMethod: true,
  subtotalAmount: true,
  taxAmount: true,
  shippingAmount: true,
  discountAmount: true,
  shippingAddress: true,
  shippingCity: true,
  shippingState: true,
  shippingZip: true,
  shippingCountry: true,
  billingAddress: true,
  sessionId: true,
  notes: true,
  paymentId: true,
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  paymentStatus: true
});

// Order Items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  priceAtPurchase: decimal("price_at_purchase", { precision: 10, scale: 2 }).notNull(),
  name: text("name"),
  price: decimal("price", { precision: 10, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  weight: text("weight"),
  metaData: text("meta_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).partial({
  name: true,
  price: true,
  subtotal: true,
  weight: true,
  metaData: true,
  id: true,
  createdAt: true,
  updatedAt: true
});

// Settings Schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  group: text("group"),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// Payment method type
export const PaymentMethodEnum = z.enum([
  "razorpay",
  "cod",
  "bank_transfer"
]);

export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  cartItems: many(cartItems),
}));

export const productsRelations = relations(products, ({ many }) => ({
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "failed"; 