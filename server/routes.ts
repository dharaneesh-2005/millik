import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCartItemSchema, insertContactSchema, insertProductSchema, insertUserSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import { z } from "zod";
import { generateSecret, generateQrCode, verifyToken } from "./otpUtils";
import { setupAuth } from "./auth";
import { createRazorpayOrder, verifyPaymentSignature, generateOrderNumber, generateTransactionId } from './razorpay';

// Session storage for admin authentication
interface AdminSession {
  userId: number;
  username: string;
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
    username: session.username
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
      
      // Only allow the admin user to log in
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.id !== 1) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid username or password" 
        });
      }
      
      // In a real app, you would properly hash and compare passwords
      // This is a simplified version for demonstration
      if (user.password !== password) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid username or password" 
        });
      }
      
      // Create session directly without OTP
      const sessionId = nanoid();
      const isUserAdmin = await storage.isAdmin(user.id);
      
      adminSessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        isAdmin: isUserAdmin,
        isAuthenticated: true
      });
      
      // Set cookie with session ID for cross-domain compatibility
      res.cookie('adminSessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.status(200).json({
        success: true,
        sessionId,
        userId: user.id,
        username: user.username
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
        username: user.username,
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
        username: session.username,
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
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
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
    }
  });

  // Razorpay integration endpoints
  
  // Create order with Razorpay
  app.post("/api/orders/create", async (req, res) => {
    try {
      const { 
        amount, name, email, phone, address, city, state, postalCode, 
        country, items 
      } = req.body;
      
      if (!amount || !items || !email) {
        return res.status(400).json({ 
          success: false, 
          message: "Amount, items, and email are required" 
        });
      }
      
      console.log('Creating order with data:', { amount, email, phone, items });
      
      // Generate a unique order number
      const orderNumber = generateOrderNumber();
      
      // Create Razorpay order
      const razorpayOrder = await createRazorpayOrder(parseFloat(amount), orderNumber);
      
      if (!razorpayOrder.success) {
        console.error('Failed to create Razorpay order:', razorpayOrder.error);
        return res.status(500).json({ 
          success: false, 
          message: razorpayOrder.error || "Failed to create Razorpay order" 
        });
      }
      
      // Save order in our database with initial pending status
      const shippingAddress = `${address}, ${city}, ${state}, ${postalCode}, ${country}`;
      
      // Calculate tax and shipping
      const subtotalAmount = (amount * 0.85).toFixed(2);
      const taxAmount = (amount * 0.10).toFixed(2);
      const shippingAmount = (amount * 0.05).toFixed(2);
      
      try {
        // Create order in database
        const newOrder = await storage.createOrder({
          orderNumber,
          email,
          phone,
          totalAmount: amount.toString(),
          subtotalAmount,
          taxAmount,
          shippingAmount,
          paymentMethod: "razorpay",
          shippingAddress,
          paymentStatus: "pending",
          transactionId: generateTransactionId(),
          sessionId: req.headers["session-id"] as string
        });
        
        // Create order items in database
        for (const item of items) {
          const product = await storage.getProductById(item.productId);
          if (product) {
            await storage.createOrderItem({
              orderId: newOrder.id,
              productId: item.productId,
              name: product.name,
              price: product.price,
              quantity: item.quantity,
              subtotal: (parseFloat(product.price) * item.quantity).toString(),
              metaData: item.metaData
            });
          }
        }
        
        res.status(200).json({
          success: true,
          orderId: razorpayOrder.orderId,
          orderNumber,
          amount: razorpayOrder.amount
        });
      } catch (dbError) {
        console.error('Database error creating order:', dbError);
        res.status(500).json({ 
          success: false, 
          message: "Database error creating order" 
        });
      }
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create order" 
      });
    }
  });
  
  // Verify Razorpay payment
  app.post("/api/orders/verify-payment", async (req, res) => {
    try {
      const { orderId, paymentId, signature } = req.body;
      
      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ 
          success: false, 
          message: "Order ID, Payment ID, and signature are required" 
        });
      }
      
      // Verify signature
      const isValid = verifyPaymentSignature(orderId, paymentId, signature);
      
      if (!isValid.success) {
        return res.status(400).json({ 
          success: false, 
          message: isValid.message || "Invalid payment signature" 
        });
      }
      
      // Find the order in our database using the Razorpay orderId
      const orders = await storage.getOrders();
      const pendingOrders = orders.filter(o => o.orderNumber && o.paymentStatus === "pending");
      
      if (pendingOrders.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "No pending orders found" 
        });
      }
      
      // Find the most recent pending order
      const order = pendingOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })[0];
      
      // Update order status
      const updatedOrder = await storage.updateOrder(order.id, {
        paymentStatus: "completed",
        status: "processing",
        paymentId,
        updatedAt: new Date()
      });
      
      // Return success response
      res.status(200).json({
        success: true,
        orderNumber: updatedOrder.orderNumber,
        message: "Payment verified successfully"
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to verify payment" 
      });
    }
  });

  return httpServer;
}
