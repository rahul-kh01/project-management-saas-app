import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ChatMessage } from "../models/chatmessage.models.js";
import { userCache, membershipCache } from "../utils/cache.js";
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

// Check if user is a member of the project (with enhanced caching)
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
    
    // Cache result for 5 minutes
    membershipCache.set(cacheKey, isMember, 5 * 60 * 1000);
    
    return isMember;
  } catch (error) {
    console.error('Error checking project membership:', error);
    return false;
  }
};

export const setupChatSocket = (io) => {
  // Socket.IO namespace for chat
  const chatNamespace = io.of("/chat");

  // Enhanced error handling and logging
  const logSocketEvent = (event, socketId, userId, data = {}) => {
    console.log(`[Socket] ${event} - Socket: ${socketId}, User: ${userId}`, data);
  };

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logSocketEvent('AUTH_FAILED', socket.id, 'unknown', { reason: 'No token' });
        return next(new Error("Authentication token required"));
      }

      // Check cache first
      let user = userCache.get(token);
      if (!user) {
        user = await verifySocketToken(token);
        if (user) {
          // Cache user for 10 minutes
          userCache.set(token, user, 10 * 60 * 1000);
          logSocketEvent('USER_CACHED', socket.id, user._id);
        }
      }

      if (!user) {
        logSocketEvent('AUTH_FAILED', socket.id, 'unknown', { reason: 'Invalid token' });
        return next(new Error("Invalid authentication token"));
      }

      // Attach user to socket
      socket.user = user;
      logSocketEvent('AUTH_SUCCESS', socket.id, user._id, { username: user.username });
      next();
    } catch (error) {
      logSocketEvent('AUTH_ERROR', socket.id, 'unknown', { error: error.message });
      next(new Error("Authentication failed"));
    }
  });

  chatNamespace.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Join project room - FIXED VERSION
    socket.on("chat:join", async ({ projectId }, callback) => {
      logSocketEvent('JOIN_ATTEMPT', socket.id, socket.user._id, { projectId });
      
      try {
        // Validate projectId
        if (!projectId) {
          const errorResponse = { error: "Project ID is required" };
          logSocketEvent('JOIN_ERROR', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Verify user is a project member (with caching)
        const isMember = await isProjectMember(socket.user._id, projectId);
        logSocketEvent('MEMBERSHIP_CHECK', socket.id, socket.user._id, { projectId, isMember });

        if (!isMember) {
          const errorResponse = {
            error: "You are not a member of this project"
          };
          logSocketEvent('JOIN_DENIED', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Join the project room
        const roomName = `project:${projectId}`;
        await socket.join(roomName);
        logSocketEvent('ROOM_JOINED', socket.id, socket.user._id, { roomName });

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

        // Acknowledge join
        const successResponse = {
          projectId,
          message: "Successfully joined chat room",
          success: true
        };
        logSocketEvent('JOIN_SUCCESS', socket.id, socket.user._id, successResponse);
        
        // Emit joined event
        socket.emit("chat:joined", successResponse);
        
        // Call callback if provided
        if (callback) {
          callback(successResponse);
        }
      } catch (error) {
        console.error("Error joining room:", error);
        const errorResponse = {
          error: "Failed to join chat room",
          details: error.message
        };
        logSocketEvent('JOIN_ERROR', socket.id, socket.user._id, errorResponse);
        socket.emit("chat:error", errorResponse);
        if (callback) callback(errorResponse);
      }
    });

    // Send message - FIXED VERSION
    socket.on("chat:message", async ({ projectId, body, tempId }, callback) => {
      logSocketEvent('MESSAGE_ATTEMPT', socket.id, socket.user._id, { projectId, tempId });
      
      try {
        // Validate inputs
        if (!projectId) {
          const errorResponse = { error: "Project ID is required" };
          logSocketEvent('MESSAGE_ERROR', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Verify user is a project member (with caching)
        const isMember = await isProjectMember(socket.user._id, projectId);
        logSocketEvent('MESSAGE_MEMBERSHIP_CHECK', socket.id, socket.user._id, { projectId, isMember });

        if (!isMember) {
          const errorResponse = {
            error: "You are not a member of this project"
          };
          logSocketEvent('MESSAGE_DENIED', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Validate message
        if (!body || !body.trim()) {
          const errorResponse = {
            error: "Message body is required"
          };
          logSocketEvent('MESSAGE_VALIDATION_ERROR', socket.id, socket.user._id, errorResponse);
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

        // Populate sender info
        const populatedMessage = await ChatMessage.findById(
          message._id
        ).populate("sender", "username fullName avatar");

        const roomName = `project:${projectId}`;

        // Broadcast to all users in the room (including sender)
        chatNamespace.to(roomName).emit("chat:new-message", {
          message: populatedMessage,
          tempId, // Include tempId for optimistic UI updates
        });

        logSocketEvent('MESSAGE_SENT', socket.id, socket.user._id, { 
          roomName, 
          messageId: populatedMessage._id,
          tempId 
        });

        // Acknowledge message sent
        const successResponse = {
          messageId: populatedMessage._id,
          tempId,
          success: true
        };
        if (callback) callback(successResponse);
      } catch (error) {
        console.error("Error sending message:", error);
        const errorResponse = {
          error: "Failed to send message",
          details: error.message
        };
        logSocketEvent('MESSAGE_ERROR', socket.id, socket.user._id, errorResponse);
        if (callback) callback(errorResponse);
      }
    });

    // Typing indicator - FIXED VERSION
    socket.on("chat:typing", async ({ projectId, isTyping }, callback) => {
      logSocketEvent('TYPING_ATTEMPT', socket.id, socket.user._id, { projectId, isTyping });
      
      try {
        // Validate inputs
        if (!projectId) {
          const errorResponse = { error: "Project ID is required" };
          logSocketEvent('TYPING_ERROR', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Verify user is a project member (with caching)
        const isMember = await isProjectMember(socket.user._id, projectId);
        logSocketEvent('TYPING_MEMBERSHIP_CHECK', socket.id, socket.user._id, { projectId, isMember });

        if (!isMember) {
          const errorResponse = { error: "Not a project member" };
          logSocketEvent('TYPING_DENIED', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        const roomName = `project:${projectId}`;

        // Broadcast typing status to others (not to self)
        socket.to(roomName).emit("chat:user-typing", {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar,
          },
          isTyping,
        });

        logSocketEvent('TYPING_BROADCAST', socket.id, socket.user._id, { roomName, isTyping });

        // Acknowledge typing status
        const successResponse = { success: true, isTyping };
        if (callback) callback(successResponse);
      } catch (error) {
        console.error("Error handling typing:", error);
        const errorResponse = { 
          error: "Failed to handle typing",
          details: error.message
        };
        logSocketEvent('TYPING_ERROR', socket.id, socket.user._id, errorResponse);
        if (callback) callback(errorResponse);
      }
    });

    // Mark message as seen - FIXED VERSION
    socket.on("chat:seen", async ({ projectId, messageId }, callback) => {
      logSocketEvent('SEEN_ATTEMPT', socket.id, socket.user._id, { projectId, messageId });
      
      try {
        // Validate inputs
        if (!projectId || !messageId) {
          const errorResponse = { error: "Project ID and Message ID are required" };
          logSocketEvent('SEEN_ERROR', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Verify user is a project member (with caching)
        const isMember = await isProjectMember(socket.user._id, projectId);
        logSocketEvent('SEEN_MEMBERSHIP_CHECK', socket.id, socket.user._id, { projectId, isMember });

        if (!isMember) {
          const errorResponse = { error: "Not a project member" };
          logSocketEvent('SEEN_DENIED', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Find message
        const message = await ChatMessage.findById(messageId);

        if (!message) {
          const errorResponse = { error: "Message not found" };
          logSocketEvent('SEEN_MESSAGE_NOT_FOUND', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Add user to readBy if not already present
        const userId = socket.user._id.toString();
        const alreadyRead = message.readBy.some(
          (id) => id.toString() === userId
        );

        if (!alreadyRead) {
          message.readBy.push(new mongoose.Types.ObjectId(socket.user._id));
          await message.save();

          const roomName = `project:${projectId}`;

          // Broadcast read receipt to all users in the room
          chatNamespace.to(roomName).emit("chat:message-seen", {
            messageId,
            userId: socket.user._id,
            username: socket.user.username,
          });

          logSocketEvent('SEEN_BROADCAST', socket.id, socket.user._id, { roomName, messageId });
        } else {
          logSocketEvent('SEEN_ALREADY_READ', socket.id, socket.user._id, { messageId });
        }

        // Acknowledge seen status
        const successResponse = { success: true, messageId };
        if (callback) callback(successResponse);
      } catch (error) {
        console.error("Error marking message as seen:", error);
        const errorResponse = { 
          error: "Failed to mark as seen",
          details: error.message
        };
        logSocketEvent('SEEN_ERROR', socket.id, socket.user._id, errorResponse);
        if (callback) callback(errorResponse);
      }
    });

    // Leave project room - FIXED VERSION
    socket.on("chat:leave", async ({ projectId }, callback) => {
      logSocketEvent('LEAVE_ATTEMPT', socket.id, socket.user._id, { projectId });
      
      try {
        // Validate inputs
        if (!projectId) {
          const errorResponse = { error: "Project ID is required" };
          logSocketEvent('LEAVE_ERROR', socket.id, socket.user._id, errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        const roomName = `project:${projectId}`;
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

        logSocketEvent('LEAVE_SUCCESS', socket.id, socket.user._id, { roomName });

        // Acknowledge leave
        const successResponse = { success: true, projectId };
        if (callback) callback(successResponse);
      } catch (error) {
        console.error("Error leaving room:", error);
        const errorResponse = { 
          error: "Failed to leave room",
          details: error.message
        };
        logSocketEvent('LEAVE_ERROR', socket.id, socket.user._id, errorResponse);
        if (callback) callback(errorResponse);
      }
    });

    // Disconnect
    socket.on("disconnect", (reason) => {
      logSocketEvent('DISCONNECT', socket.id, socket.user._id, { reason });
      console.log(`User disconnected: ${socket.user.username} (${socket.id}) - Reason: ${reason}`);
    });

    // Error handling
    socket.on("error", (error) => {
      logSocketEvent('SOCKET_ERROR', socket.id, socket.user._id, { error: error.message });
      console.error(`Socket error for ${socket.user.username}:`, error);
    });
  });

  console.log("Chat socket handlers registered");
};
