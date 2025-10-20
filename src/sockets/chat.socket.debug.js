/**
 * Debug Chat Socket Handler
 * 
 * This is a simplified version to debug the acknowledgment issues
 */

import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ChatMessage } from "../models/chatmessage.models.js";
import mongoose from "mongoose";

// Verify JWT token from socket handshake
const verifySocketToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );
    return user;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const setupChatSocket = (io) => {
  console.log('🔧 Setting up DEBUG chat socket handlers...');
  
  // Socket.IO namespace for chat
  const chatNamespace = io.of("/chat");
  console.log('✅ Chat namespace created');

  // Simple middleware
  chatNamespace.use(async (socket, next) => {
    console.log('🔐 Socket middleware - token:', socket.handshake.auth.token ? 'Present' : 'Missing');
    
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        console.log('❌ No token provided');
        return next(new Error("Authentication token required"));
      }

      const user = await verifySocketToken(token);
      if (!user) {
        console.log('❌ Invalid token');
        return next(new Error("Invalid authentication token"));
      }

      socket.user = user;
      console.log('✅ User authenticated:', user.username);
      next();
    } catch (error) {
      console.error('❌ Middleware error:', error);
      next(new Error("Authentication failed"));
    }
  });

  chatNamespace.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // Simple join handler with immediate response
    socket.on("chat:join", async ({ projectId }, callback) => {
      console.log(`📥 Join request received from ${socket.user.username} for project ${projectId}`);
      
      try {
        // Always respond immediately for debugging
        const response = {
          projectId,
          message: "Debug: Successfully joined chat room",
          success: true,
          debug: true
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
      console.log(`📥 Message request received from ${socket.user.username}:`, body);
      
      try {
        const response = {
          messageId: `debug_${Date.now()}`,
          tempId,
          success: true,
          debug: true
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
              fullName: socket.user.fullName,
              avatar: socket.user.avatar
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
      console.log(`📥 Typing request received from ${socket.user.username}:`, isTyping);
      
      try {
        const response = {
          success: true,
          isTyping,
          debug: true
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

    // Disconnect handler
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected: ${socket.user.username} (${socket.id}) - Reason: ${reason}`);
    });

    // Error handler
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.user.username}:`, error);
    });
  });

  console.log('✅ DEBUG Chat socket handlers registered');
};
