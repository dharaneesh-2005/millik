import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  otpSecret: text("otp_secret"),
  otpEnabled: boolean("otp_enabled").default(false),
  isAdmin: boolean("is_admin").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  address: true,
});

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

// Order Schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  email: text("email"),
  phone: text("phone"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  userId: integer("user_id"),
  sessionId: text("session_id"),
  orderNumber: text("order_number").notNull().unique(),
  totalAmount: text("total_amount").notNull(),
  subtotalAmount: text("subtotal_amount").notNull(),
  taxAmount: text("tax_amount").notNull(),
  shippingAmount: text("shipping_amount").notNull(),
  discountAmount: text("discount_amount").default("0"),
  paymentId: text("payment_id"),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").default("pending"),
  transactionId: text("transaction_id"),
  shippingAddress: text("shipping_address").notNull(),
  billingAddress: text("billing_address"),
  shippingMethod: text("shipping_method").default("standard"),
  notes: text("notes"),
  couponCode: text("coupon_code"),
  trackingId: text("tracking_id"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Order Items Schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  metaData: text("meta_data"),
  orderId: integer("order_id").notNull(),
  subtotal: text("subtotal").notNull(),
  weight: text("weight"),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
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

// Order status type
export const OrderStatusEnum = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled"
]);

export type OrderStatus = z.infer<typeof OrderStatusEnum>;

// Payment status type
export const PaymentStatusEnum = z.enum([
  "pending",
  "completed",
  "failed"
]);

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

// Payment method type
export const PaymentMethodEnum = z.enum([
  "razorpay",
  "cod",
  "bank_transfer"
]);

export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
