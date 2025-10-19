import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./db/index.js";
import { setupChatSocket } from "./sockets/chat.socket.js";
import { validateEnvironment } from "./utils/env-validator.js";

dotenv.config({
  path: "./.env",
});

// Validate environment variables
validateEnvironment();

const port = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Setup chat socket handlers
setupChatSocket(io);

import { logger } from "./utils/logger.js";

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      logger.info(`Server listening on http://localhost:${port}`);
      logger.info("Socket.IO ready for connections");
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error", { error: err.message });
    process.exit(1);
  });
