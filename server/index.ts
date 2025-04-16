import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { initializeDatabase } from "./db";

// Try to load environment variables from .env file
try {
  if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('Loaded environment variables from .env file');
  }
} catch (error) {
  console.error('Error loading .env file:', error);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize the database if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    try {
      console.log("Database URL found, length:", process.env.DATABASE_URL.length);
      // Don't log the full URL for security
      console.log("Database URL defined, connecting...");
      console.log("Attempting to initialize database connection...");
      
      const dbConnection = await initializeDatabase(process.env.DATABASE_URL);
      
      if (dbConnection && dbConnection.client && dbConnection.db) {
        log('Database initialized successfully');
        
        // Test the connection
        try {
          const result = await dbConnection.db.execute('SELECT NOW()');
          const serverTime = result[0] && result[0].now ? result[0].now : 'unknown';
          log(`Database connection test passed. Server time: ${serverTime}`);
        } catch (testError) {
          log('Database connection test failed: ' + (testError instanceof Error ? testError.message : String(testError)));
        }
      } else {
        log('Database initialization failed: Client or DB not returned');
      }
    } catch (error) {
      log(`Error initializing database: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        log('Error stack: ' + error.stack);
      }
      
      // Try to identify specific connection issues
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          log('Could not connect to PostgreSQL server. Check if the server is running and accessible.');
        } else if (error.message.includes('password authentication failed')) {
          log('Database authentication failed. Check your username and password.');
        } else if (error.message.includes('database') && error.message.includes('does not exist')) {
          log('Database does not exist. Check your database name.');
        } else if (error.message.includes('role') && error.message.includes('does not exist')) {
          log('Database role/user does not exist. Check your database username.');
        }
      }
    }
  } else {
    log('No DATABASE_URL found, skipping database initialization. Check your .env file.');
    
    // Print environment variables for debugging (redacted for security)
    const envVars = Object.keys(process.env)
      .filter(key => key.includes('PG') || key.includes('DATABASE') || key === 'NODE_ENV')
      .reduce((obj, key) => {
        const value = process.env[key];
        obj[key] = value ? `Defined (length: ${value.length})` : 'Not defined';
        return obj;
      }, {} as Record<string, string>);
    
    log('Environment variables: ' + JSON.stringify(envVars));
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Configure server for both local development and Vercel deployment
  const port = process.env.PORT || 3000;
  
  // Function to try binding to a port, and fallback to another if it fails
  const startServer = (portToUse: number, maxRetries = 3) => {
    server.listen(portToUse, () => {
      log(`serving on port ${portToUse}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && maxRetries > 0) {
        log(`Port ${portToUse} is in use, trying ${portToUse + 1}...`);
        startServer(portToUse + 1, maxRetries - 1);
      } else {
        throw err;
      }
    });
  };
  
  startServer(Number(port));
})();
