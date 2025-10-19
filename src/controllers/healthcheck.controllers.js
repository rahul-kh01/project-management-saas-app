import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";

const healthCheck = asyncHandler(async (req, res) => {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    services: {
      database: "unknown",
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB"
      }
    }
  };

  // Check database connection
  try {
    if (mongoose.connection.readyState === 1) {
      healthStatus.services.database = "connected";
    } else {
      healthStatus.services.database = "disconnected";
      healthStatus.status = "degraded";
    }
  } catch (error) {
    healthStatus.services.database = "error";
    healthStatus.status = "unhealthy";
  }

  const statusCode = healthStatus.status === "healthy" ? 200 : 503;
  
  res.status(statusCode).json(new ApiResponse(statusCode, healthStatus));
});

export { healthCheck };
