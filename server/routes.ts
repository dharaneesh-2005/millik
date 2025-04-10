import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCartItemSchema, insertContactSchema, insertProductSchema, insertUserSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { z } from "zod";
import { generateSecret, generateQrCode, verifyToken } from "./otpUtils";
import { setupAuth } from "./auth";
import { createRazorpayOrder, verifyPaymentSignature, generateOrderNumber, generateTransactionId } from './razorpay';
import crypto from 'crypto';

// Session storage for admin authentication
interface AdminSession {
  userId: number;
  email: string;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const adminSessions = new Map<string, AdminSession>();

// Admin middleware to check if the user has admin privileges
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  console.log("Admin auth check - headers:", JSON.stringify(req.headers));
  
  // For simplified admin access in serverless environments, allow x-admin-key
  const adminKey = req.headers["x-admin-key"] as string;
  // Get admin secret from environment variable or use fallback for local development
  const adminSecret = process.env.ADMIN_KEY || process.env.ADMIN_SECRET || "admin-secret";
  
  if (adminKey === adminSecret) {
    console.log("Admin auth successful via admin-key");
    
    // Add default admin user data to the request
    (req as any).adminUser = {
      userId: 1,  // Default admin user ID
      username: "admin"
    };
    return next();
  }

  // Otherwise, check for admin session ID in headers, authorization header, or cookies
  const sessionId = (
    req.headers["admin-session-id"] as string || 
    req.headers["x-admin-session-id"] as string || 
    req.headers["authorization"]?.replace("Bearer ", "") ||
    req.cookies?.adminSessionId
  );
  
  console.log("Admin auth check - sessionId:", sessionId);
  console.log("Admin auth check - headers:", req.headers);
  
  if (!sessionId) {
    return res.status(403).json({ 
      success: false,
      message: "Unauthorized access - No session ID or admin key found" 
    });
  }
  
  if (!adminSessions.has(sessionId)) {
    console.log("Admin session not found for ID:", sessionId);
    return res.status(403).json({ 
      success: false,
      message: "Unauthorized access - Invalid session" 
    });
  }
  
  const session = adminSessions.get(sessionId)!;
  console.log("Admin session found:", session);
  
  if (!session.isAuthenticated || !session.isAdmin) {
    return res.status(403).json({ 
      success: false,
      message: "Unauthorized access - Not authenticated or not admin" 
    });
  }
  
  // Add the admin user data to the request
  (req as any).adminUser = {
    userId: session.userId,
    username: session.email
  };
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Admin authentication routes handled below
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Health check endpoint for Railway
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching featured products" });
    }
  });

  app.get("/api/products/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const products = await storage.getProductsByCategory(category);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching products by category" });
    }
  });

  app.get("/api/products/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const products = await storage.searchProducts(query);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error searching products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  app.get("/api/products/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const product = await storage.getProductBySlug(slug);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  // Check if a session has already reviewed a product
  app.get("/api/products/:id/session-review", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Parse reviews
      if (!product.reviews) {
        return res.json({ hasReviewed: false });
      }
      
      try {
        const reviews = JSON.parse(product.reviews);
        if (!Array.isArray(reviews)) {
          return res.json({ hasReviewed: false });
        }
        
        // Check if session has already reviewed
        const existingReview = reviews.find((r: any) => r.sessionId === sessionId);
        
        if (existingReview) {
          return res.json({ 
            hasReviewed: true, 
            review: existingReview 
          });
        } else {
          return res.json({ hasReviewed: false });
        }
      } catch (error) {
        console.error("Error parsing reviews:", error);
        return res.json({ hasReviewed: false });
      }
    } catch (error) {
      console.error("Error checking session review:", error);
      res.status(500).json({ error: "Failed to check review status" });
    }
  });

  // Cart management
  app.get("/api/cart", async (req, res) => {
    try {
      let sessionId = req.headers["session-id"] as string;
      
      if (!sessionId) {
        sessionId = nanoid();
        res.setHeader("session-id", sessionId);
      }
      
      console.log("Fetching cart items for session:", sessionId);
      
      const cartItems = await storage.getCartItems(sessionId);
      
      // Ensure cartItems is an array
      if (!Array.isArray(cartItems)) {
        console.error("Error: cartItems is not an array:", cartItems);
        res.status(500).json({ message: "Invalid cart data format" });
        return;
      }
      
      console.log("Found cart items:", cartItems.length);
      
      // Get product details for each cart item
      const cartWithProducts = await Promise.all(
        cartItems.map(async (item) => {
          try {
            const product = await storage.getProductById(item.productId);
            return {
              ...item,
              product,
            };
          } catch (err) {
            console.error(`Error fetching product ${item.productId}:`, err);
            return {
              ...item,
              product: null,
            };
          }
        })
      );
      
      console.log("Returning cart with products:", cartWithProducts.length);
      res.json(cartWithProducts);
    } catch (error) {
      console.error("Error fetching cart items:", error);
      res.status(500).json({ message: "Error fetching cart items" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      let sessionId = req.headers["session-id"] as string;
      
      if (!sessionId) {
        sessionId = nanoid();
        res.setHeader("session-id", sessionId);
      }
      
      const validatedData = insertCartItemSchema.parse({
        ...req.body,
        sessionId,
      });
      
      console.log("Cart add request with data:", validatedData);
      
      // Instead of just checking by product ID, now we need to also check the metaData
      // to differentiate between different weight options of the same product
      let existingItemWithSameWeight = null;
      
      try {
        // Try to use the method that handles metaData properly
        existingItemWithSameWeight = await storage.getCartItemWithProduct(
          sessionId, 
          validatedData.productId,
          validatedData.metaData || undefined
        );
      } catch (error) {
        console.error("Error finding cart item with same weight:", error);
        
        // Fallback to old method if the new one fails
        const existingItems = await storage.getCartItems(sessionId);
        
        for (const item of existingItems) {
          if (item.productId === validatedData.productId) {
            // Check if metaData (weight options) match
            if (
              (item.metaData === null && validatedData.metaData === null) ||
              (item.metaData === validatedData.metaData) ||
              (item.metaData && validatedData.metaData && 
               item.metaData.toString() === validatedData.metaData.toString())
            ) {
              existingItemWithSameWeight = item;
              break;
            }
          }
        }
      }
      
      // If we found an existing item with the same weight, update its quantity
      if (existingItemWithSameWeight) {
        console.log(`Found existing cart item with same weight, updating quantity from ${existingItemWithSameWeight.quantity} to ${existingItemWithSameWeight.quantity + (validatedData.quantity || 1)}`);
        const updatedItem = await storage.updateCartItem(
          existingItemWithSameWeight.id,
          existingItemWithSameWeight.quantity + (validatedData.quantity || 1)
        );
        return res.json(updatedItem);
      }
      
      // If no matching item (same product + same weight) found, add as new item
      const newCartItem = await storage.addToCart(validatedData);
      res.status(201).json(newCartItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error adding item to cart" });
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cart item ID" });
      }
      
      const { quantity } = req.body;
      if (typeof quantity !== "number" || quantity < 1) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      
      const updatedItem = await storage.updateCartItem(id, quantity);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Error updating cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cart item ID" });
      }
      
      await storage.removeFromCart(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error removing item from cart" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"] as string;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      await storage.clearCart(sessionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error clearing cart" });
    }
  });

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error submitting contact form" });
    }
  });

  // Admin Authentication Routes
  
  // Admin Login - Only allows the predefined admin user (simplified without OTP)
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false,
          message: "Username and password are required" 
        });
      }
      
      console.log("Attempting admin login with:", { username, password: '***' });
      
      // Hardcoded admin check - this allows the admin to log in even if the DB has issues
      if (username === 'admin_millikit' && password === 'the_millikit') {
        console.log("Using hardcoded admin credentials");
        
        // Generate session ID using crypto or nanoid
        const sessionId = crypto.randomUUID();
        
        // Store session with admin privileges
        adminSessions.set(sessionId, {
          userId: 1, // Use ID 1 for admin
          email: "admin@millikit.com",
          isAdmin: true,
          isAuthenticated: true
        });
        
        // Return success response
        return res.status(200).json({
          success: true,
          sessionId,
          userId: 1,
          username: "admin_millikit"
        });
      }
      
      // If not using hardcoded admin, try database lookup
      let user = null;
      
      if (storage.getUserByUsername) {
        user = await storage.getUserByUsername(username);
      }
      
      // Also try getting by email if username looks like an email
      if (!user && username.includes('@') && storage.getUserByEmail) {
        user = await storage.getUserByEmail(username);
      }
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid username or password" 
        });
      }
      
      // Check admin status
      // Check both role and isAdmin for compatibility
      const isUserAdmin = (user.role === 'admin') || (user.isAdmin === true);
      console.log("User admin status:", { 
        role: user.role, 
        isAdmin: user.isAdmin,
        isAdminResult: isUserAdmin
      });
      
      if (!isUserAdmin) {
        return res.status(403).json({ 
          success: false,
          message: "Not authorized" 
        });
      }
      
      // Check password - handle both old and new schema
      const userPassword = user.password || user.hashedPassword;
      if (userPassword !== password) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid username or password" 
        });
      }
      
      // Generate session ID
      const sessionId = crypto.randomUUID();
      
      // Store session
      adminSessions.set(sessionId, {
        userId: user.id,
        email: user.email || username,
        isAdmin: true, // Force to true since we already checked
        isAuthenticated: true
      });
      
      // Return success
      res.status(200).json({
        success: true,
        sessionId,
        userId: user.id,
        username: user.username || user.email || username
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false,
        message: "An error occurred during login" 
      });
    }
  });
  
  // Admin OTP Verification
  app.post("/api/admin/verify-otp", async (req, res) => {
    try {
      const { userId, token } = req.body;
      
      if (!userId || !token) {
        return res.status(400).json({ 
          success: false,
          message: "User ID and token are required" 
        });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }
      
      const isValid = await storage.verifyOtp(userId, token);
      
      if (!isValid) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid OTP code" 
        });
      }
      
      // Create session if OTP is valid
      const sessionId = nanoid();
      const isUserAdmin = await storage.isAdmin(user.id);
      
      adminSessions.set(sessionId, {
        userId: user.id,
        email: user.username,
        isAdmin: isUserAdmin,
        isAuthenticated: true
      });
      
      res.status(200).json({
        success: true,
        sessionId,
        userId: user.id,
        username: user.username
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ 
        success: false,
        message: "An error occurred during verification" 
      });
    }
  });
  
  // Admin Registration - Disabled, only predefined admin allowed
  app.post("/api/admin/register", async (req, res) => {
    // Return error since registration is disabled
    return res.status(403).json({ 
      success: false,
      message: "Registration is disabled. Please use the predefined admin credentials." 
    });
  });
  
  // Admin OTP Setup - only works for predefined admin user
  app.post("/api/admin/setup-otp", async (req, res) => {
    try {
      const { username, password, currentOtpToken } = req.body;
      
      // Check if username is admin
      if (username !== "admin") {
        return res.status(401).json({
          success: false,
          message: "Only the admin user can set up 2FA"
        });
      }
      
      // Get the admin user (only works for the predefined admin user with ID 1)
      const user = await storage.getUser(1); // Use ID 1 which is our predefined admin
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: "Admin user not found" 
        });
      }
      
      // Verify password
      if (password !== "millikit2023") {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials"
        });
      }
      
      // Check if user already has OTP enabled
      if (user.otpEnabled && user.otpSecret) {
        // If user already has OTP enabled, we need to verify the current OTP token
        // before allowing to generate a new one
        if (!currentOtpToken) {
          return res.status(400).json({
            success: false,
            message: "Current OTP token required to regenerate 2FA",
            needsCurrentOtp: true,
            userId: user.id
          });
        }
        
        // Verify the current OTP token
        const isValidToken = await storage.verifyOtp(user.id, currentOtpToken);
        
        if (!isValidToken) {
          return res.status(400).json({
            success: false,
            message: "Current OTP token required to regenerate 2FA",
            needsCurrentOtp: true,
            userId: user.id
          });
        }
      }
      
      // Generate OTP secret for user
      const secret = generateSecret(user.username);
      
      // Generate QR code for Google Authenticator
      const qrCodeUrl = await generateQrCode(user.username, secret);
      
      // If OTP is already enabled, warn in the response but still allow regenerating
      const alreadyEnabled = user.otpEnabled;
      
      res.status(200).json({
        success: true,
        userId: user.id, // Return the actual user ID
        secret,
        qrCodeUrl,
        alreadyEnabled: alreadyEnabled
      });
    } catch (error) {
      console.error('OTP setup error:', error);
      res.status(500).json({ 
        success: false,
        message: "An error occurred during OTP setup" 
      });
    }
  });
  
  // Admin OTP Verification after setup
  app.post("/api/admin/verify-setup", async (req, res) => {
    try {
      const { userId, token, secret } = req.body;
      
      if (!userId || !token || !secret) {
        return res.status(400).json({ 
          success: false,
          message: "User ID, token, and secret are required" 
        });
      }
      
      // Verify token manually since the secret isn't yet saved
      const isValid = verifyToken(token, secret);
      
      if (!isValid) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid OTP code" 
        });
      }
      
      // Enable OTP for the user and save the secret
      const updatedUser = await storage.enableOtp(userId, secret);
      
      if (!updatedUser) {
        return res.status(500).json({ 
          success: false,
          message: "Failed to enable OTP for user" 
        });
      }
      
      res.status(200).json({
        success: true,
        userId: updatedUser.id,
        otpEnabled: true
      });
    } catch (error) {
      console.error('Setup verification error:', error);
      res.status(500).json({ 
        success: false,
        message: "An error occurred during verification" 
      });
    }
  });
  
  // Admin Logout
  app.post("/api/admin/logout", async (req, res) => {
    try {
      const sessionId = (
        req.headers["admin-session-id"] as string || 
        req.headers["x-admin-session-id"] as string || 
        req.headers["authorization"]?.replace("Bearer ", "") ||
        req.cookies?.adminSessionId
      );
      
      if (sessionId && adminSessions.has(sessionId)) {
        adminSessions.delete(sessionId);
      }
      
      // Clear the session cookie
      res.clearCookie('adminSessionId');
      
      res.status(200).json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        success: false,
        message: "An error occurred during logout" 
      });
    }
  });
  
  // Admin Session Check
  app.get("/api/admin/session", async (req, res) => {
    try {
      // Check for admin key first (for serverless environments)
      const adminKey = req.headers["x-admin-key"] as string;
      const adminSecret = process.env.ADMIN_KEY || process.env.ADMIN_SECRET || "admin-secret";
      
      // If admin key is provided and matches, return admin session info
      if (adminKey === adminSecret) {
        console.log("Admin auth successful via admin-key in session check");
        return res.status(200).json({
          success: true,
          authenticated: true,
          isAdmin: true,
          userId: 1, // Default admin user ID
          username: "admin_millikit",
          authMethod: "key"
        });
      }
      
      // Check for admin session ID in headers, authorization header, or cookies
      const sessionId = (
        req.headers["admin-session-id"] as string || 
        req.headers["x-admin-session-id"] as string || 
        req.headers["authorization"]?.replace("Bearer ", "") ||
        req.cookies?.adminSessionId
      );
      
      console.log("Admin session check - sessionId:", sessionId);
      console.log("Admin session check - headers:", req.headers);
      
      if (!sessionId || !adminSessions.has(sessionId)) {
        return res.status(401).json({ 
          success: false,
          authenticated: false 
        });
      }
      
      const session = adminSessions.get(sessionId)!;
      
      res.status(200).json({
        success: true,
        authenticated: session.isAuthenticated,
        isAdmin: session.isAdmin,
        userId: session.userId,
        username: session.email,
        authMethod: "session"
      });
    } catch (error) {
      console.error('Session check error:', error);
      res.status(500).json({ 
        success: false,
        message: "An error occurred during session check" 
      });
    }
  });
  
  // Admin Routes
  
  // Admin Product Management
  app.post("/api/admin/products", isAdmin, async (req, res) => {
    try {
      console.log("Creating product with data:", req.body);
      
      // Pre-process the numeric fields to handle empty strings
      const dataWithDefaultsApplied = { ...req.body };
      
      // Handle empty strings in numeric fields by setting to null or appropriate defaults
      if (dataWithDefaultsApplied.rating === "") dataWithDefaultsApplied.rating = null;
      if (dataWithDefaultsApplied.comparePrice === "") dataWithDefaultsApplied.comparePrice = null;
      
      // Parse the data with the schema
      const productData = insertProductSchema.parse(dataWithDefaultsApplied);
      console.log("Parsed product data:", productData);
      
      const product = await storage.createProduct(productData);
      console.log("Product created successfully:", product);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      // Return more detailed error message
      res.status(500).json({ 
        message: "Error creating product", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.put("/api/admin/products/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Pre-process the numeric fields to handle empty strings
      const dataWithDefaultsApplied = { ...req.body };
      
      // Handle empty strings in numeric fields by setting to null or appropriate defaults
      if (dataWithDefaultsApplied.rating === "") dataWithDefaultsApplied.rating = null;
      if (dataWithDefaultsApplied.comparePrice === "") dataWithDefaultsApplied.comparePrice = null;
      
      const updatedProduct = await storage.updateProduct(id, dataWithDefaultsApplied);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      // Return more detailed error message
      res.status(500).json({ 
        message: "Error updating product", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.delete("/api/admin/products/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // The product deletion now handles cart items in the storage implementation
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      // Include more detailed error information in the response
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ 
        message: "Error deleting product", 
        details: errorMessage,
        productId: req.params.id
      });
    }
  });
  
  // Specialized endpoint for updating weight prices directly
  app.post("/api/admin/products/:id/weight-prices", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      // Validate the request body
      if (!req.body || !req.body.weightPrices) {
        return res.status(400).json({ message: "Weight prices are required" });
      }
      
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log("Updating product weight prices:", id, req.body.weightPrices);
      
      // Extract weight options from weight prices object
      const weightPricesObj = typeof req.body.weightPrices === 'string' 
        ? JSON.parse(req.body.weightPrices) 
        : req.body.weightPrices;
      
      // Get the keys from the weight prices object to use as weight options
      const weightOptions = Object.keys(weightPricesObj);
      console.log("Extracted weight options:", weightOptions);
      
      // Update both weight prices and weight options fields
      const updatedProduct = await storage.updateProduct(id, {
        weightPrices: typeof req.body.weightPrices === 'string' 
          ? req.body.weightPrices 
          : JSON.stringify(req.body.weightPrices),
        weightOptions: weightOptions
      });
      
      res.status(200).json(updatedProduct);
    } catch (error) {
      console.error("Error updating weight prices:", error);
      res.status(500).json({ message: "Error updating weight prices" });
    }
  });

  // Admin Contact Management
  app.get("/api/admin/contacts", isAdmin, async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching contacts" });
    }
  });

  // Update a product
  app.patch("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Extract fields from request body
      const updateData = req.body;
      console.log(`Updating product ${productId} with data:`, updateData);
      
      // Special handling for reviews to avoid double-JSON stringification
      if (updateData.reviews) {
        try {
          // Check if the reviews field is already a JSON string
          JSON.parse(updateData.reviews);
          console.log("Reviews is already a valid JSON string");
        } catch (e) {
          // If parsing fails, it means we need to stringify the reviews
          console.log("Reviews is not a JSON string, stringifying it");
          updateData.reviews = JSON.stringify(updateData.reviews);
        }
      }
      
      // Update the product
      await storage.updateProduct(productId, updateData);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Orders API routes
  app.post("/api/checkout", async (req, res) => {
    try {
<<<<<<< HEAD
      console.log("==========================================");
      console.log("Checkout endpoint hit");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Request headers:", JSON.stringify(req.headers, null, 2));

      // Get or generate a session ID
      let sessionId = req.headers["session-id"] as string;
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        console.log("Generated new session ID:", sessionId);
      } else {
        console.log("Using existing session ID:", sessionId);
      }

      // Validate required fields
      const requiredFields = [
        "email", "phone", "paymentMethod", "shippingAddress", "items"
      ];
      
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        console.log("Missing required fields:", missingFields);
        return res.status(400).json({ 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }

      if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
        console.log("Items array is empty or invalid");
        return res.status(400).json({ 
          success: false, 
          message: "Items must be a non-empty array"
        });
      }

      const { email, phone, paymentMethod, shippingAddress, items } = req.body;
      
      console.log(`Checkout data: email=${email}, phone=${phone}, paymentMethod=${paymentMethod}, items count=${items.length}`);

      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      console.log(`Generated order number: ${orderNumber}`);

      // Get all product details for the items
      const products = await Promise.all(
        items.map(async (item: any) => {
          try {
            return await storage.getProductById(item.productId);
          } catch (error) {
            console.error(`Error fetching product ${item.productId}:`, error);
            return null;
          }
        })
      );

      // Check if any products don't exist
      const invalidProducts = products.map((p, idx) => !p ? items[idx].productId : null).filter(Boolean);
      if (invalidProducts.length > 0) {
        console.log("Invalid product IDs:", invalidProducts);
        return res.status(400).json({ 
          success: false, 
          message: `Invalid product IDs: ${invalidProducts.join(', ')}` 
        });
      }

      // Calculate order totals
      let subtotalAmount = "0";
      const taxRate = 0.05; // 5% tax
      let taxAmount = "0";
      const shippingAmount = items.length > 5 ? "100.00" : "50.00"; // Shipping fee based on number of items
      let totalAmount = "0";

      // Calculate prices
      subtotalAmount = items.reduce((total: number, item: any, idx: number) => {
        const product = products[idx];
        if (!product) return total;
        const itemPrice = parseFloat(product.price) * item.quantity;
        return total + itemPrice;
      }, 0).toFixed(2);

      taxAmount = (parseFloat(subtotalAmount) * taxRate).toFixed(2);
      totalAmount = (
        parseFloat(subtotalAmount) + 
        parseFloat(taxAmount) + 
        parseFloat(shippingAmount)
      ).toFixed(2);

      console.log(`Order calculations: subtotal=${subtotalAmount}, tax=${taxAmount}, shipping=${shippingAmount}, total=${totalAmount}`);

      // Create an order
      console.log("Preparing to create order...");
      
      try {
        // Prepare order data
        const orderData: any = {
          sessionId,
          orderNumber,
          status: "pending",
          paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
          totalAmount,
          subtotalAmount,
          taxAmount,
          shippingAmount,
          paymentMethod,
          email,
          phone,
          shippingAddress,
          // Add more detailed address fields
          shippingCity: req.body.shippingCity || '',
          shippingState: req.body.shippingState || '',
          shippingZip: req.body.shippingZip || '',
          shippingCountry: req.body.shippingCountry || 'India',
          shippingMethod: req.body.shippingMethod || 'standard',
          // Add shipping status fields
          isShipped: false,
          trackingNumber: null,
          // Record customer's name if provided
          name: req.body.name || '',
          // Format address data properly
          billingDetails: typeof req.body.billingDetails === 'string' 
            ? req.body.billingDetails 
            : JSON.stringify({
                address: shippingAddress,
                city: req.body.shippingCity || '',
                state: req.body.shippingState || '',
                zip: req.body.shippingZip || '',
                country: req.body.shippingCountry || 'India'
              }),
          shippingDetails: typeof req.body.shippingDetails === 'string'
            ? req.body.shippingDetails
            : JSON.stringify({
                address: shippingAddress,
                city: req.body.shippingCity || '',
                state: req.body.shippingState || '',
                zip: req.body.shippingZip || '',
                country: req.body.shippingCountry || 'India'
              }),
          userId: req.body.userId || 1, // Default to admin user if no user is logged in
          notes: req.body.notes || '',
          // Set creation timestamp
          createdAt: new Date()
        };
        
        console.log("Creating order with data:", JSON.stringify(orderData, null, 2));
        
        const order = await storage.createOrder(orderData);
        console.log("Order created successfully, ID:", order.id, "OrderNumber:", order.orderNumber);
        
        // Create order items
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const product = products[i];
          if (!product) continue;
          
          const priceAtPurchase = product.price;
          const subtotal = (parseFloat(priceAtPurchase) * item.quantity).toFixed(2);
          
          const orderItem = {
            orderId: order.id,
            productId: product.id,
            quantity: item.quantity,
            priceAtPurchase,
            name: product.name,
            price: priceAtPurchase,
            subtotal,
            metaData: item.metaData || null,
          };
          
          console.log(`Creating order item for product ${product.id}:`, JSON.stringify(orderItem, null, 2));
          try {
            const createdItem = await storage.createOrderItem(orderItem);
            console.log(`Order item created successfully, ID: ${createdItem.id}`);
          } catch (itemError) {
            console.error(`Error creating order item for product ${product.id}:`, itemError);
          }
        }
        
        // Clear the cart if order was created successfully
        try {
          if (sessionId) {
            console.log(`Clearing cart for session ${sessionId}`);
            await storage.clearCart(sessionId);
          }
        } catch (clearCartError) {
          console.error("Error clearing cart:", clearCartError);
        }
        
        // Return success response
        res.status(200).json({
          success: true,
          message: "Order placed successfully",
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
          },
        });
      } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ 
          success: false, 
          message: "Error creating order",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error processing checkout",
        error: error instanceof Error ? error.message : String(error)
=======
      const { 
        email, 
        phone, 
        shippingAddress, 
        shippingCity, 
        shippingState, 
        shippingZip, 
        shippingCountry,
        paymentMethod,
        cartItems: items,
        notes
      } = req.body;
      
      // Validate required fields
      if (!email || !phone || !shippingAddress || !shippingCity || !shippingState || !shippingZip || !paymentMethod || !items) {
        return res.status(400).json({ 
          success: false,
          message: "Missing required fields" 
        });
      }
      
      let sessionId = req.headers["session-id"] as string;
      if (!sessionId) {
        return res.status(400).json({ 
          success: false,
          message: "Session ID is required" 
        });
      }
      
      // Get cart items and calculate totals
      const cartItems = await storage.getCartItems(sessionId);
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: "Cart is empty" 
        });
      }
      
      // Get product details for each cart item
      const orderItems = await Promise.all(
        cartItems.map(async (item) => {
          const product = await storage.getProductById(item.productId);
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }
          
          // Extract weight from metaData if available
          let weight = '';
          let priceToUse = product.price;
          
          if (item.metaData) {
            try {
              const metaData = JSON.parse(item.metaData);
              weight = metaData.weight || '';
              
              // If we have weight-specific pricing, use that
              if (weight && product.weightPrices) {
                const weightPrices = JSON.parse(product.weightPrices);
                if (weightPrices[weight] && weightPrices[weight].price) {
                  priceToUse = weightPrices[weight].price;
                }
              }
            } catch (e) {
              console.warn('Error parsing cart item metaData:', e);
            }
          }
          
          // Calculate subtotal (price * quantity)
          const price = parseFloat(priceToUse);
          const subtotal = price * item.quantity;
          
          return {
            productId: item.productId,
            name: product.name,
            price: price.toString(),
            quantity: item.quantity,
            subtotal: subtotal.toString(),
            weight,
            metaData: item.metaData
          };
        })
      );
      
      // Calculate order totals
      const subtotalAmount = orderItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
      
      // Get shipping settings
      const shippingRateRaw = await storage.getSetting('shipping_rate') || '50';
      const freeShippingThresholdRaw = await storage.getSetting('free_shipping_threshold') || '1000';
      const taxRateRaw = await storage.getSetting('tax_rate') || '5';
      
      const shippingRate = parseFloat(shippingRateRaw);
      const freeShippingThreshold = parseFloat(freeShippingThresholdRaw);
      const taxRate = parseFloat(taxRateRaw);
      
      // Calculate shipping amount
      const shippingAmount = subtotalAmount >= freeShippingThreshold ? 0 : shippingRate;
      
      // Calculate tax amount
      const taxAmount = (subtotalAmount * taxRate) / 100;
      
      // Calculate total amount
      const totalAmount = subtotalAmount + shippingAmount + taxAmount;
      
      // Generate order number
      const { generateOrderNumber } = await import('./phonepe');
      const orderNumber = generateOrderNumber();
      
      // Create order
      const order = await storage.createOrder({
        sessionId,
        orderNumber,
        status: 'pending',
        totalAmount: totalAmount.toString(),
        subtotalAmount: subtotalAmount.toString(),
        taxAmount: taxAmount.toString(),
        shippingAmount: shippingAmount.toString(),
        discountAmount: '0',
        paymentMethod,
        paymentStatus: 'pending',
        email,
        phone,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry: shippingCountry || 'India',
        items: JSON.stringify(orderItems),
        notes
      });
      
      // Create order items
      await Promise.all(
        orderItems.map(item => storage.createOrderItem({
          orderId: order.id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          weight: item.weight,
          metaData: item.metaData
        }))
      );
      
      // If payment method is PhonePe, create a payment request
      if (paymentMethod === 'phonepay') {
        const { createPaymentRequest } = await import('./phonepe');
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/payment/callback`;
        
        const paymentRequest = await createPaymentRequest(
          totalAmount,
          orderNumber,
          email,
          phone,
          callbackUrl
        );
        
        if (paymentRequest.success) {
          // Update order with transaction ID
          await storage.updateOrder(order.id, {
            paymentId: paymentRequest.transactionId
          });
          
          res.status(200).json({
            success: true,
            order,
            redirectUrl: paymentRequest.paymentUrl,
            paymentId: paymentRequest.transactionId
          });
        } else {
          res.status(400).json({
            success: false,
            message: paymentRequest.error
          });
        }
      } else {
        // For COD or other payment methods, just return the order
        res.status(200).json({
          success: true,
          order
        });
        
        // Send order confirmation email
        const { sendOrderConfirmationEmail } = await import('./email');
        await sendOrderConfirmationEmail(order, await storage.getOrderItems(order.id), []);
        
        // Clear the cart
        await storage.clearCart(sessionId);
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during checkout' 
>>>>>>> 9859d4149557cc4742a0dd4c883a94c6f8069d84
      });
    }
  });

  // Payment callback route
  app.get("/api/payment/callback", async (req, res) => {
    try {
      const { transactionId } = req.query;
      
      if (!transactionId) {
        return res.status(400).json({ 
          success: false,
          message: "Transaction ID is required" 
        });
      }
      
      // Check payment status
      const { checkPaymentStatus } = await import('./phonepe');
      const paymentStatus = await checkPaymentStatus(transactionId as string);
      
      // Get order by payment ID
      const order = await storage.getOrderByPaymentId(transactionId as string);
      
      if (!order) {
        return res.status(404).json({ 
          success: false,
          message: "Order not found" 
        });
      }
      
      if (paymentStatus.success) {
        // Update order status based on payment status
        const status = paymentStatus.status === 'PAYMENT_SUCCESS' ? 'processing' : 
                      paymentStatus.status === 'PAYMENT_ERROR' ? 'failed' : 'pending';
        
        const paymentStatusText = paymentStatus.status === 'PAYMENT_SUCCESS' ? 'completed' : 
                                  paymentStatus.status === 'PAYMENT_ERROR' ? 'failed' : 'pending';
        
        await storage.updateOrder(order.id, {
          status,
          paymentStatus: paymentStatusText
        });
        
        // Get updated order
        const updatedOrder = await storage.getOrderById(order.id);
        
        // If payment is successful:
        if (status === 'processing') {
          // Send order confirmation email
          const { sendOrderConfirmationEmail } = await import('./email');
          const orderItems = await storage.getOrderItems(order.id);
          const products = await Promise.all(
            orderItems.map(item => storage.getProductById(item.productId))
          );
          
          await sendOrderConfirmationEmail(updatedOrder!, orderItems, products.filter(Boolean)!);
          
          // Clear the cart
          await storage.clearCart(order.sessionId);
          
          // Redirect to success page
          return res.redirect(`/order-success?orderId=${order.id}`);
        } else {
          // Redirect to failure page
          return res.redirect(`/order-failed?orderId=${order.id}`);
        }
      } else {
        // Update order status to failed
        await storage.updateOrder(order.id, {
          status: 'failed',
          paymentStatus: 'failed'
        });
        
        // Redirect to failure page
        return res.redirect(`/order-failed?orderId=${order.id}`);
      }
    } catch (error) {
      console.error('Error during payment callback:', error);
      res.status(500).redirect('/order-failed');
    }
  });

  // Get order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Get order items
      const orderItems = await storage.getOrderItems(id);
      
      res.json({ order, orderItems });
    } catch (error) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  // Get orders for session
  app.get("/api/orders", async (req, res) => {
    try {
      const sessionId = req.headers["session-id"] as string;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      const orders = await storage.getOrdersBySessionId(sessionId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  // Get orders by user email
  app.get("/api/orders/email/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const orders = await storage.getOrdersByEmail(email);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  // Admin order management routes
  app.get("/api/admin/orders", isAdmin, async (req, res) => {
    try {
<<<<<<< HEAD
      console.log("Admin orders endpoint hit - fetching all orders");
      
      // Check if PostgreSQL storage is being used
      console.log("Storage implementation being used:", storage.constructor.name);
      
      // Get all orders and log the result
      const orders = await storage.getOrders();
      console.log(`Successfully fetched ${orders.length} orders from storage`);
      if (orders.length > 0) {
        console.log("First order example:", JSON.stringify(orders[0], null, 2));
      } else {
        console.log("No orders found in the database");
        // Check database connection
        try {
          console.log("Testing database connection...");
          // Simple database query to check if the connection is working
          const postgresStorage = storage as any;
          if (postgresStorage.db) {
            const result = await postgresStorage.db.execute('SELECT NOW()');
            console.log("Database connection test result:", result);
          } else {
            console.log("Database connection not properly initialized");
          }
        } catch (dbError) {
          console.error("Database connection test failed:", dbError);
        }
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
=======
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
>>>>>>> 9859d4149557cc4742a0dd4c883a94c6f8069d84
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  app.get("/api/admin/orders/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Get order items
      const orderItems = await storage.getOrderItems(id);
      
      res.json({ order, orderItems });
    } catch (error) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  app.patch("/api/admin/orders/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      await storage.updateOrder(id, req.body);
      
      // Get updated order
      const updatedOrder = await storage.getOrderById(id);
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error updating order" });
    }
  });

<<<<<<< HEAD
  // Update order status
  app.put("/api/admin/orders/:id", async (req, res) => {
    try {
      // Check admin authorization
      if (req.headers["x-admin-key"] !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { id } = req.params;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "failed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const updatedOrder = await storage.updateOrder(parseInt(id), {
        status,
        updatedAt: new Date()
      });
      
      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error(`Error updating order ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Update order shipping details
  app.put("/api/admin/orders/:id/shipping", async (req, res) => {
    try {
      // Check admin authorization
      if (req.headers["x-admin-key"] !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { id } = req.params;
      const { isShipped, trackingNumber } = req.body;
      
      if (typeof isShipped !== 'boolean') {
        return res.status(400).json({ message: "isShipped must be a boolean" });
      }
      
      const result = await storage.updateOrderShippingDetails(
        parseInt(id),
        isShipped,
        trackingNumber
      );
      
      if (!result) {
        return res.status(500).json({ message: "Failed to update order shipping details" });
      }
      
      // Get updated order
      const updatedOrder = await storage.getOrderById(parseInt(id));
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found after update" });
      }
      
      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error(`Error updating order shipping details for order ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to update order shipping details",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Send order confirmation email
  app.post("/api/admin/orders/:id/send-confirmation", async (req, res) => {
    try {
      // Check admin authorization
      if (req.headers["x-admin-key"] !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { id } = req.params;
      const order = await storage.getOrderById(parseInt(id));
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (!order.email) {
        return res.status(400).json({ message: "Order has no associated email address" });
      }
      
      // Get order items
      const items = await storage.getOrderItems(order.id);
      
      // Send email (in a real app, you would use a service like Nodemailer, SendGrid, etc.)
      // For this demo, we'll just log to console
      console.log(`Sending order confirmation email for order ${order.orderNumber} to ${order.email}`);
      console.log(`Order details: ${JSON.stringify(order)}`);
      console.log(`Order items: ${JSON.stringify(items)}`);
      
      // In a real app, you would integrate with an email service here
      // await sendOrderConfirmationEmail(order, items);
      
      // For our demo, we'll just mark it as a success
      res.status(200).json({ message: "Order confirmation email sent successfully" });
    } catch (error) {
      console.error(`Error sending confirmation email for order ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to send confirmation email" });
    }
  });

  // Email template definition, previously deleted
  const sendOrderConfirmationEmail = async (order: any, items: any[]) => {
    // This is a placeholder for now - in a real app, you would integrate with an email service
    // such as NodeMailer, SendGrid, Mailgun, etc.
    
    // Example email template
    const emailContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 10px; text-align: center; }
          .order-info { margin: 20px 0; }
          .order-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .order-items th, .order-items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .order-items th { background-color: #f2f2f2; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Order Confirmation</h2>
          </div>
          
          <p>Thank you for your order with Millikit!</p>
          
          <div class="order-info">
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
          </div>
          
          <h3>Order Items</h3>
          <table class="order-items">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price}</td>
                  <td>₹${item.subtotal}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="order-summary">
            <p><strong>Subtotal:</strong> ₹${order.subtotalAmount}</p>
            <p><strong>Shipping:</strong> ₹${order.shippingAmount}</p>
            <p><strong>Tax:</strong> ₹${order.taxAmount}</p>
            <p><strong>Total:</strong> ₹${order.totalAmount}</p>
          </div>
          
          <p>If you have any questions about your order, please contact our customer service.</p>
          
          <div class="footer">
            <p>Millikit - Premium Quality Millets</p>
            <p>© ${new Date().getFullYear()} Millikit. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    console.log(`Email template would be: ${emailContent}`);
    
    // In a real app, you would send the email here
    // Example with NodeMailer:
    /*
    const transporter = nodemailer.createTransport({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    const info = await transporter.sendMail({
      from: '"Millikit Store" <orders@millikit.com>',
      to: order.email,
      subject: `Order Confirmation #${order.orderNumber}`,
      html: emailContent
    });
    
    return info;
    */
  };

  // Diagnostic endpoint to check database connectivity
  app.get("/api/admin/db-status", async (req, res) => {
    try {
      if (req.headers["x-admin-key"] !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Test the database connection directly
      const isConnected = await storage.testConnection();
      
      let tables = [];
      let orderCount = 0;
      
      // If we're using PostgreSQL, we can get more detailed diagnostics
      if (storage.constructor.name === "PostgreSQLStorage") {
        try {
          // Try to get all orders
          const orders = await storage.getOrders();
          orderCount = orders.length;
          
          // Cast to any to bypass TypeScript checks for diagnostic purposes
          const postgresStorage = storage as any;
          if (postgresStorage.db) {
            // Check if tables exist
            const tablesResult = await postgresStorage.db.execute(
              `SELECT table_name FROM information_schema.tables 
               WHERE table_schema = 'public' 
               ORDER BY table_name`
            );
            tables = tablesResult.map((row: any) => row.table_name);
          }
        } catch (error) {
          console.error("Error getting additional diagnostics:", error);
        }
      }
      
      // Return comprehensive status information
      res.json({
        status: "success",
        connection: {
          isConnected,
          storageType: storage.constructor.name
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          databaseUrl: process.env.DATABASE_URL ? "Defined (length: " + process.env.DATABASE_URL.length + ")" : "Not defined",
          pgDatabase: process.env.PGDATABASE,
          pgHost: process.env.PGHOST,
          adminSecret: process.env.ADMIN_SECRET ? "Defined" : "Not defined",
        },
        database: {
          tables,
          orderCount
        }
      });
    } catch (error) {
      console.error("Error checking database status:", error);
      res.status(500).json({ 
        status: "error",
        message: "Error checking database status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Fallback endpoint to get mock orders for testing the admin panel
  app.get("/api/admin/mock-orders", async (req, res) => {
    try {
      // Check admin authorization
      if (req.headers["x-admin-key"] !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Generate 5 mock orders
      const mockOrders = [];
      for (let i = 1; i <= 5; i++) {
        mockOrders.push({
          id: i,
          orderNumber: `ORD${(1000000 + i).toString().substring(1)}`,
          email: `customer${i}@example.com`,
          phone: "+91987654321" + i,
          status: i % 5 === 0 ? "cancelled" : 
                 i % 4 === 0 ? "failed" : 
                 i % 3 === 0 ? "completed" : 
                 i % 2 === 0 ? "processing" : "pending",
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // i days ago
          updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000), // i/2 days ago
          userId: null,
          sessionId: `session_${i}`,
          totalAmount: (1000 + i * 100).toString(),
          subtotalAmount: (900 + i * 100).toString(),
          taxAmount: "50",
          shippingAmount: "50",
          discountAmount: "0",
          paymentId: `pay_${i}abc123`,
          paymentMethod: "razorpay",
          paymentStatus: i % 3 === 0 ? "completed" : i % 2 === 0 ? "pending" : "failed",
          transactionId: null,
          shippingAddress: `123 Test St, Apt ${i}, Mumbai, India`,
          billingAddress: null,
          shippingMethod: "standard",
          notes: null,
          couponCode: null
        });
      }
      
      console.log(`Generated ${mockOrders.length} mock orders for testing`);
      res.status(200).json(mockOrders);
    } catch (error) {
      console.error("Error generating mock orders:", error);
      res.status(500).json({ 
        message: "Failed to generate mock orders", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Fallback endpoint to get mock order items
  app.get("/api/admin/mock-orders/:id/items", async (req, res) => {
    try {
      // Check admin authorization
      if (req.headers["x-admin-key"] !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { id } = req.params;
      const orderId = parseInt(id);
      
      // Generate 2-3 mock order items per order
      const itemCount = (orderId % 2) + 2; // 2-3 items
      const mockOrderItems = [];
      
      for (let i = 1; i <= itemCount; i++) {
        const quantity = i % 3 + 1; // 1-3 quantity
        const price = (200 * i).toString();
        const subtotal = (parseInt(price) * quantity).toString();
        
        mockOrderItems.push({
          id: (orderId * 10) + i,
          name: `Product ${i} for Order ${orderId}`,
          price: price,
          createdAt: new Date(Date.now() - orderId * 24 * 60 * 60 * 1000), // orderId days ago
          productId: i * 2,
          quantity: quantity,
          metaData: null,
          orderId: orderId,
          subtotal: subtotal,
          weight: (0.5 * i).toString()
        });
      }
      
      console.log(`Generated ${mockOrderItems.length} mock order items for order ${orderId}`);
      res.status(200).json(mockOrderItems);
    } catch (error) {
      console.error(`Error generating mock order items for order ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to generate mock order items", 
        error: error instanceof Error ? error.message : String(error)
      });
=======
  // Settings management routes
  app.get("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching settings" });
    }
  });

  app.get("/api/admin/settings/:key", isAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json({ key, value: setting });
    } catch (error) {
      res.status(500).json({ message: "Error fetching setting" });
    }
  });

  app.put("/api/admin/settings/:key", isAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description, group } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      // Check if setting exists
      const existingSetting = await storage.getSetting(key);
      
      if (existingSetting) {
        // Update existing setting
        await storage.updateSetting(key, { value, description, group });
      } else {
        // Create new setting
        await storage.createSetting({ key, value, description, group });
      }
      
      res.status(200).json({ key, value });
    } catch (error) {
      res.status(500).json({ message: "Error updating setting" });
>>>>>>> 9859d4149557cc4742a0dd4c883a94c6f8069d84
    }
  });

  return httpServer;
}