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

// Initialize Socket.IO with optimized CORS and performance settings
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
  // Performance optimizations
  pingTimeout: 60000,        // Increase ping timeout
  pingInterval: 25000,        // Increase ping interval
  upgradeTimeout: 10000,      // Increase upgrade timeout
  maxHttpBufferSize: 1e6,     // 1MB buffer size
  allowEIO3: true,            // Allow Engine.IO v3 clients
  transports: ['websocket', 'polling'], // Enable both transports
  // Connection state recovery
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
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
