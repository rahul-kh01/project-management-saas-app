import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./db/index.js";
import { setupChatSocket } from "./sockets/chat.socket.js";
import { validateEnvironment } from "./utils/env-validator.js";
import { spawn } from "node:child_process";

dotenv.config({
  path: "./.env",
});

// Validate environment variables
validateEnvironment();

const port = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO with production-grade configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin"],
  },
  // Production performance optimizations
  pingTimeout: 60000,           // 60 seconds ping timeout
  pingInterval: 25000,          // 25 seconds ping interval
  upgradeTimeout: 10000,        // 10 seconds upgrade timeout
  maxHttpBufferSize: 1e6,       // 1MB buffer size
  allowEIO3: true,              // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling'], // Enable both transports
  // Connection state recovery for production
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  // Additional production settings
  serveClient: false,           // Don't serve client files
  allowRequest: (req, fn) => {
    // Custom request validation for production
    const origin = req.headers.origin;
    const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"];
    
    if (allowedOrigins.includes(origin) || !origin) {
      fn(null, true);
    } else {
      fn(null, false);
    }
  },
  // Rate limiting for production
  maxConnections: 1000,         // Max connections per namespace
  // Compression for production
  compression: true,
  // Additional security
  cookie: {
    name: 'io',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
});

// Setup chat socket handlers
setupChatSocket(io);

import { logger } from "./utils/logger.js";

connectDB()
  .then(() => {
    // Optionally seed test users on startup (idempotent) when enabled
    if (String(process.env.SEED_TEST_USERS).toLowerCase() === "true") {
      const seeder = spawn("node", ["src/create-test-users.js"], {
        stdio: "inherit",
        env: process.env,
      });

      seeder.on("close", (code) => {
        logger.info(`Test user seeding finished with code ${code}`);
      });

      seeder.on("error", (error) => {
        logger.error("Failed to run test user seeder", { error: error.message });
      });
    }

    httpServer.listen(port, () => {
      logger.info(`Server listening on http://localhost:${port}`);
      logger.info("Socket.IO ready for connections");
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error", { error: err.message });
    process.exit(1);
  });
