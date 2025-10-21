/**
 * Production-Grade Chat Socket Handler
 * 
 * This implementation provides robust real-time chat functionality with:
 * - Proper acknowledgment handling
 * - Membership validation
 * - Error handling and recovery
 * - Performance optimizations
 * - Production-ready configuration
 */

import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ChatMessage } from "../models/chatmessage.models.js";
import { userCache, membershipCache } from "../utils/cache.js";
import mongoose from "mongoose";

// Enhanced token verification with better error handling
const verifySocketToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );
    return user;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

// Enhanced membership check with better caching and error handling
const isProjectMember = async (userId, projectId) => {
  const cacheKey = `membership:${userId}:${projectId}`;
  
  // Check cache first
  if (membershipCache.has(cacheKey)) {
    return membershipCache.get(cacheKey);
  }

  try {
    const membership = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(userId),
    });
    
    const isMember = !!membership;
    // Cache for 5 minutes
    membershipCache.set(cacheKey, isMember, 5 * 60 * 1000);
    return isMember;
  } catch (error) {
    console.error('Error checking project membership:', error);
    return false;
  }
};

// Enhanced room management
const getRoomName = (projectId) => `project:${projectId}`;

// Enhanced error response helper
const createErrorResponse = (error, details = null) => ({
  error: error,
  details: details,
  timestamp: new Date().toISOString()
});

// Enhanced success response helper
const createSuccessResponse = (data = {}) => ({
  success: true,
  timestamp: new Date().toISOString(),
  ...data
});

export const setupChatSocket = (io) => {
  console.log("🔧 Setting up PRODUCTION chat socket handlers...");
  
  const chatNamespace = io.of("/chat");

  // Enhanced authentication middleware
  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        console.log('❌ No authentication token provided');
        return next(new Error("Authentication token required"));
      }

      // Check cache first
      let user = userCache.get(token);
      if (!user) {
        user = await verifySocketToken(token);
        if (user) {
          // Cache user for 10 minutes
          userCache.set(token, user, 10 * 60 * 1000);
        }
      }

      if (!user) {
        console.log('❌ Invalid authentication token');
        return next(new Error("Invalid authentication token"));
      }

      socket.user = user;
      console.log(`✅ User authenticated: ${user.username} (${socket.id})`);
      next();
    } catch (error) {
      console.error('❌ Authentication middleware error:', error);
      next(new Error("Authentication failed"));
    }
  });

  chatNamespace.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // JOIN PROJECT ROOM - PRODUCTION VERSION
    socket.on("chat:join", async (data, callback) => {
      const { projectId } = data;
      console.log(`📥 JOIN REQUEST: ${socket.user.username} -> ${projectId}`);
      
      try {
        // Validate input
        if (!projectId) {
          console.log(`❌ JOIN ERROR: No project ID`);
          const errorResponse = createErrorResponse("Project ID is required");
          if (callback) callback(errorResponse);
          return;
        }

        // Check membership
        const isMember = await isProjectMember(socket.user._id, projectId);
        console.log(`🔍 MEMBERSHIP CHECK: ${isMember ? 'MEMBER' : 'NOT MEMBER'}`);

        if (!isMember) {
          console.log(`❌ JOIN DENIED: Not a project member`);
          const errorResponse = createErrorResponse("Not a project member");
          if (callback) callback(errorResponse);
          return;
        }

        // Join room
        const roomName = getRoomName(projectId);
        await socket.join(roomName);
        console.log(`✅ JOINED ROOM: ${roomName}`);

        // Send success response
        const successResponse = createSuccessResponse({
          projectId,
          message: "Successfully joined chat room"
        });
        
        if (callback) {
          console.log(`📤 SENDING JOIN SUCCESS CALLBACK`);
          callback(successResponse);
        }

        // Notify others in the room
        socket.to(roomName).emit("chat:user-joined", {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar,
          },
          timestamp: new Date(),
        });

        // Emit joined event to self
        socket.emit("chat:joined", successResponse);

      } catch (error) {
        console.error("❌ JOIN ERROR:", error);
        const errorResponse = createErrorResponse("Failed to join chat room", error.message);
        if (callback) callback(errorResponse);
        socket.emit("chat:error", errorResponse);
      }
    });

    // SEND MESSAGE - PRODUCTION VERSION
    socket.on("chat:message", async (data, callback) => {
      const { projectId, body, tempId } = data;
      console.log(`📥 MESSAGE REQUEST: ${socket.user.username} -> ${body}`);
      
      try {
        // Validate input
        if (!projectId || !body) {
          console.log(`❌ MESSAGE ERROR: Missing data`);
          const errorResponse = createErrorResponse("Project ID and message body are required");
          if (callback) callback(errorResponse);
          return;
        }

        // Check membership
        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          console.log(`❌ MESSAGE DENIED: Not a project member`);
          const errorResponse = createErrorResponse("Not a project member");
          if (callback) callback(errorResponse);
          return;
        }

        // Create message in database
        const message = await ChatMessage.create({
          project: new mongoose.Types.ObjectId(projectId),
          sender: new mongoose.Types.ObjectId(socket.user._id),
          body: body.trim(),
          readBy: [new mongoose.Types.ObjectId(socket.user._id)],
        });

        // Populate sender information
        const populatedMessage = await ChatMessage.findById(message._id)
          .populate("sender", "username fullName avatar");

        // Send success response
        const successResponse = createSuccessResponse({
          messageId: message._id,
          tempId,
        });
        
        if (callback) {
          console.log(`📤 SENDING MESSAGE SUCCESS CALLBACK`);
          callback(successResponse);
        }

        // Broadcast message to all users in the room
        const roomName = getRoomName(projectId);
        chatNamespace.to(roomName).emit("chat:new-message", {
          message: populatedMessage,
          tempId,
        });

        console.log(`✅ MESSAGE SENT: ${message._id}`);

      } catch (error) {
        console.error("❌ MESSAGE ERROR:", error);
        const errorResponse = createErrorResponse("Failed to send message", error.message);
        if (callback) callback(errorResponse);
        socket.emit("chat:error", errorResponse);
      }
    });

    // TYPING INDICATOR - PRODUCTION VERSION
    socket.on("chat:typing", async (data, callback) => {
      const { projectId, isTyping } = data;
      console.log(`📥 TYPING REQUEST: ${socket.user.username} -> ${isTyping}`);
      
      try {
        // Validate input
        if (!projectId) {
          console.log(`❌ TYPING ERROR: No project ID`);
          const errorResponse = createErrorResponse("Project ID is required");
          if (callback) callback(errorResponse);
          return;
        }

        // Check membership
        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          console.log(`❌ TYPING DENIED: Not a project member`);
          const errorResponse = createErrorResponse("Not a project member");
          if (callback) callback(errorResponse);
          return;
        }

        // Broadcast typing status to others (not to self)
        const roomName = getRoomName(projectId);
        socket.to(roomName).emit("chat:user-typing", {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar,
          },
          isTyping,
          timestamp: new Date()
        });

        // Send success response
        const successResponse = createSuccessResponse({
          isTyping,
        });
        
        if (callback) {
          console.log(`📤 SENDING TYPING SUCCESS CALLBACK`);
          callback(successResponse);
        }

        console.log(`✅ TYPING BROADCAST: ${isTyping}`);

      } catch (error) {
        console.error("❌ TYPING ERROR:", error);
        const errorResponse = createErrorResponse("Failed to handle typing", error.message);
        if (callback) callback(errorResponse);
      }
    });

    // MARK AS SEEN - PRODUCTION VERSION
    socket.on("chat:seen", async (data, callback) => {
      const { projectId, messageId } = data;
      console.log(`📥 SEEN REQUEST: ${socket.user.username} -> ${messageId}`);
      
      try {
        // Validate input
        if (!projectId || !messageId) {
          console.log(`❌ SEEN ERROR: Missing data`);
          const errorResponse = createErrorResponse("Project ID and Message ID are required");
          if (callback) callback(errorResponse);
          return;
        }

        // Check membership
        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          console.log(`❌ SEEN DENIED: Not a project member`);
          const errorResponse = createErrorResponse("Not a project member");
          if (callback) callback(errorResponse);
          return;
        }

        // Find message
        const message = await ChatMessage.findById(messageId);
        if (!message) {
          console.log(`❌ SEEN ERROR: Message not found`);
          const errorResponse = createErrorResponse("Message not found");
          if (callback) callback(errorResponse);
          return;
        }

        // Check if already read
        const userId = socket.user._id.toString();
        const alreadyRead = message.readBy.some(id => id.toString() === userId);

        if (!alreadyRead) {
          // Add user to readBy array
          message.readBy.push(new mongoose.Types.ObjectId(socket.user._id));
          await message.save();

          // Broadcast to all users in the room
          const roomName = getRoomName(projectId);
          chatNamespace.to(roomName).emit("chat:message-seen", {
            messageId,
            userId: socket.user._id,
            username: socket.user.username,
            timestamp: new Date()
          });

          console.log(`✅ SEEN BROADCAST: ${messageId}`);
        } else {
          console.log(`ℹ️ SEEN ALREADY READ: ${messageId}`);
        }

        // Send success response
        const successResponse = createSuccessResponse({
          messageId,
        });
        
        if (callback) {
          console.log(`📤 SENDING SEEN SUCCESS CALLBACK`);
          callback(successResponse);
        }

      } catch (error) {
        console.error("❌ SEEN ERROR:", error);
        const errorResponse = createErrorResponse("Failed to mark as seen", error.message);
        if (callback) callback(errorResponse);
      }
    });

    // LEAVE PROJECT ROOM - PRODUCTION VERSION
    socket.on("chat:leave", async (data, callback) => {
      const { projectId } = data;
      console.log(`📥 LEAVE REQUEST: ${socket.user.username} -> ${projectId}`);
      
      try {
        // Validate input
        if (!projectId) {
          console.log(`❌ LEAVE ERROR: No project ID`);
          const errorResponse = createErrorResponse("Project ID is required");
          if (callback) callback(errorResponse);
          return;
        }

        // Leave room
        const roomName = getRoomName(projectId);
        socket.leave(roomName);

        // Notify others in the room
        socket.to(roomName).emit("chat:user-left", {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar,
          },
          timestamp: new Date(),
        });

        console.log(`✅ LEFT ROOM: ${roomName}`);

        // Send success response
        const successResponse = createSuccessResponse({
          projectId,
        });
        
        if (callback) {
          console.log(`📤 SENDING LEAVE SUCCESS CALLBACK`);
          callback(successResponse);
        }

      } catch (error) {
        console.error("❌ LEAVE ERROR:", error);
        const errorResponse = createErrorResponse("Failed to leave room", error.message);
        if (callback) callback(errorResponse);
      }
    });

    // DISCONNECT HANDLER
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected: ${socket.user.username} (${socket.id}) - ${reason}`);
    });

    // ERROR HANDLER
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.user.username}:`, error);
    });
  });

  console.log("✅ PRODUCTION Chat socket handlers registered");
};