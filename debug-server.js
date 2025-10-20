/**
 * Debug Server
 * 
 * Simple server to debug socket callback issues
 */

import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const port = 3001;
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Simple middleware (skip auth for debugging)
io.use(async (socket, next) => {
  console.log('🔐 Auth token:', socket.handshake.auth.token ? 'Present' : 'Missing');
  socket.user = { _id: 'test-user-id', username: 'test-user' };
  console.log('✅ User authenticated:', socket.user.username);
  next();
});

io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

  // Simple join handler
  socket.on("chat:join", async ({ projectId }, callback) => {
    console.log(`📥 Join request: ${projectId}`);
    
    try {
      // Simulate some processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = {
        projectId,
        message: "Successfully joined chat room",
        success: true
      };
      
      console.log('📤 Sending join response:', response);
      
      if (callback) {
        callback(response);
      } else {
        console.log('⚠️  No callback provided for join');
      }
      
      // Also emit the joined event
      socket.emit("chat:joined", response);
      
    } catch (error) {
      console.error('❌ Join error:', error);
      const errorResponse = {
        error: "Failed to join chat room",
        details: error.message
      };
      
      if (callback) {
        callback(errorResponse);
      }
      socket.emit("chat:error", errorResponse);
    }
  });

  // Simple message handler
  socket.on("chat:message", async ({ projectId, body, tempId }, callback) => {
    console.log(`📥 Message request: ${projectId} - ${body}`);
    
    try {
      // Simulate some processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = {
        messageId: `debug_${Date.now()}`,
        tempId,
        success: true
      };
      
      console.log('📤 Sending message response:', response);
      
      if (callback) {
        callback(response);
      } else {
        console.log('⚠️  No callback provided for message');
      }
      
      // Emit the message back
      socket.emit("chat:new-message", {
        message: {
          _id: response.messageId,
          body,
          sender: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.username,
            avatar: null
          },
          createdAt: new Date().toISOString(),
          readBy: [socket.user._id]
        },
        tempId
      });
      
    } catch (error) {
      console.error('❌ Message error:', error);
      const errorResponse = {
        error: "Failed to send message",
        details: error.message
      };
      
      if (callback) {
        callback(errorResponse);
      }
      socket.emit("chat:error", errorResponse);
    }
  });

  // Simple typing handler
  socket.on("chat:typing", async ({ projectId, isTyping }, callback) => {
    console.log(`📥 Typing request: ${projectId} - ${isTyping}`);
    
    try {
      // Simulate some processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const response = {
        success: true,
        isTyping
      };
      
      console.log('📤 Sending typing response:', response);
      
      if (callback) {
        callback(response);
      } else {
        console.log('⚠️  No callback provided for typing');
      }
      
    } catch (error) {
      console.error('❌ Typing error:', error);
      const errorResponse = {
        error: "Failed to handle typing",
        details: error.message
      };
      
      if (callback) {
        callback(errorResponse);
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 User disconnected: ${socket.user.username} (${socket.id}) - Reason: ${reason}`);
  });

  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.user.username}:`, error);
  });
});

httpServer.listen(port, () => {
  console.log(`🚀 Debug server listening on http://localhost:${port}`);
  console.log('Socket.IO ready for connections');
});
