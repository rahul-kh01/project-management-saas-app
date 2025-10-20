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

// Check if user is a member of the project
const isProjectMember = async (userId, projectId) => {
  const cacheKey = `membership:${userId}:${projectId}`;
  
  if (membershipCache.has(cacheKey)) {
    return membershipCache.get(cacheKey);
  }

  try {
    const membership = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(userId),
    });
    
    const isMember = !!membership;
    membershipCache.set(cacheKey, isMember, 5 * 60 * 1000);
    return isMember;
  } catch (error) {
    console.error('Error checking project membership:', error);
    return false;
  }
};

export const setupChatSocket = (io) => {
  console.log("🔧 Setting up CHAT socket handlers...");
  
  const chatNamespace = io.of("/chat");

  // Authentication middleware
  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      let user = userCache.get(token);
      if (!user) {
        user = await verifySocketToken(token);
        if (user) {
          userCache.set(token, user, 10 * 60 * 1000);
        }
      }

      if (!user) {
        return next(new Error("Invalid authentication token"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  chatNamespace.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // JOIN PROJECT ROOM - CALLBACK WORKING VERSION
    socket.on("chat:join", (data, callback) => {
      const { projectId } = data;
      console.log(`📥 JOIN REQUEST: ${socket.user.username} -> ${projectId}`);
      
      // Handle async operations in IIFE
      (async () => {
      try {
        if (!projectId) {
          console.log(`❌ JOIN ERROR: No project ID`);
          const errorResponse = { error: "Project ID is required" };
          if (callback) {
            console.log(`📤 SENDING JOIN ERROR CALLBACK`);
            callback(errorResponse);
          }
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        console.log(`🔍 MEMBERSHIP CHECK: ${isMember ? 'MEMBER' : 'NOT MEMBER'}`);

        if (!isMember) {
          console.log(`❌ JOIN DENIED: Not a project member`);
          const errorResponse = { error: "Not a project member" };
          if (callback) {
            console.log(`📤 SENDING JOIN DENIED CALLBACK`);
            callback(errorResponse);
          }
          return;
        }

        const roomName = `project:${projectId}`;
        await socket.join(roomName);
        console.log(`✅ JOINED ROOM: ${roomName}`);

        // Send success callback FIRST
        const successResponse = {
          projectId,
          message: "Successfully joined chat room",
          success: true,
          timestamp: new Date().toISOString()
        };
        
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
        const errorResponse = {
          error: "Failed to join chat room", 
          details: error.message
        };
        if (callback) {
          console.log(`📤 SENDING JOIN ERROR CALLBACK`);
          callback(errorResponse);
        }
        socket.emit("chat:error", errorResponse);
      }
      })();
    });

    // SEND MESSAGE - CALLBACK WORKING VERSION
    socket.on("chat:message", (data, callback) => {
      const { projectId, body, tempId } = data;
      console.log(`📥 MESSAGE REQUEST: ${socket.user.username} -> ${body}`);
      
      // Handle async operations in IIFE
      (async () => {
      try {
        if (!projectId || !body) {
          console.log(`❌ MESSAGE ERROR: Missing data`);
          const errorResponse = { error: "Project ID and message body are required" };
          if (callback) {
            console.log(`📤 SENDING MESSAGE ERROR CALLBACK`);
            callback(errorResponse);
          }
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          console.log(`❌ MESSAGE DENIED: Not a project member`);
          const errorResponse = { error: "Not a project member" };
          if (callback) {
            console.log(`📤 SENDING MESSAGE DENIED CALLBACK`);
            callback(errorResponse);
          }
          return;
        }

        // Create message in database
        const message = await ChatMessage.create({
          project: new mongoose.Types.ObjectId(projectId),
          sender: new mongoose.Types.ObjectId(socket.user._id),
          body: body.trim(),
          readBy: [new mongoose.Types.ObjectId(socket.user._id)],
        });

        const populatedMessage = await ChatMessage.findById(message._id)
          .populate("sender", "username fullName avatar");

        // Send success callback FIRST
        const successResponse = {
          messageId: message._id,
          tempId,
          success: true,
          timestamp: new Date().toISOString()
        };
        
        if (callback) {
          console.log(`📤 SENDING MESSAGE SUCCESS CALLBACK`);
          callback(successResponse);
        }

        const roomName = `project:${projectId}`;
        
        // Broadcast message to ALL users in the room (including sender)
        chatNamespace.to(roomName).emit("chat:new-message", {
          message: populatedMessage,
          tempId,
        });

        console.log(`✅ MESSAGE SENT: ${message._id}`);

      } catch (error) {
        console.error("❌ MESSAGE ERROR:", error);
        const errorResponse = {
          error: "Failed to send message", 
          details: error.message
        };
        if (callback) {
          console.log(`📤 SENDING MESSAGE ERROR CALLBACK`);
          callback(errorResponse);
        }
        socket.emit("chat:error", errorResponse);
      }
      })();
    });

    // TYPING INDICATOR - FIXED VERSION
    socket.on("chat:typing", (data, callback) => {
      const { projectId, isTyping } = data;
      console.log(`📥 TYPING REQUEST: ${socket.user.username} -> ${isTyping}`);
      
      // Send immediate callback for faster response
      if (callback) {
        console.log(`📤 SENDING TYPING SUCCESS CALLBACK`);
        callback({
          success: true,
          isTyping,
          timestamp: new Date().toISOString()
        });
      }

      // Handle async operations in background
      (async () => {
        try {
          if (!projectId) {
            console.log(`❌ TYPING ERROR: No project ID`);
            return;
          }

          const isMember = await isProjectMember(socket.user._id, projectId);
          if (!isMember) {
            console.log(`❌ TYPING DENIED: Not a project member`);
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
            timestamp: new Date()
          });

          console.log(`✅ TYPING BROADCAST: ${isTyping}`);

        } catch (error) {
          console.error("❌ TYPING ERROR:", error);
        }
      })();
    });

    // MARK AS SEEN - FIXED VERSION
    socket.on("chat:seen", (data, callback) => {
      const { projectId, messageId } = data;
      console.log(`📥 SEEN REQUEST: ${socket.user.username} -> ${messageId}`);
      
      // Send immediate callback for faster response
      if (callback) {
        console.log(`📤 SENDING SEEN SUCCESS CALLBACK`);
        callback({
          success: true,
          messageId,
          timestamp: new Date().toISOString()
        });
      }

      // Handle async operations in background
      (async () => {
        try {
          if (!projectId || !messageId) {
            console.log(`❌ SEEN ERROR: Missing data`);
            return;
          }

          const isMember = await isProjectMember(socket.user._id, projectId);
          if (!isMember) {
            console.log(`❌ SEEN DENIED: Not a project member`);
            return;
          }

          const message = await ChatMessage.findById(messageId);
          if (!message) {
            console.log(`❌ SEEN ERROR: Message not found`);
            return;
          }

          const userId = socket.user._id.toString();
          const alreadyRead = message.readBy.some(id => id.toString() === userId);

          if (!alreadyRead) {
            message.readBy.push(new mongoose.Types.ObjectId(socket.user._id));
            await message.save();

            const roomName = `project:${projectId}`;
            
            // Broadcast to all users in the room
            chatNamespace.in(roomName).emit("chat:message-seen", {
              messageId,
              userId: socket.user._id,
              username: socket.user.username,
              timestamp: new Date()
            });

            console.log(`✅ SEEN BROADCAST: ${messageId}`);
          } else {
            console.log(`ℹ️ SEEN ALREADY READ: ${messageId}`);
          }

        } catch (error) {
          console.error("❌ SEEN ERROR:", error);
        }
      })();
    });

    // LEAVE PROJECT ROOM - FIXED VERSION
    socket.on("chat:leave", (data, callback) => {
      const { projectId } = data;
      console.log(`📥 LEAVE REQUEST: ${socket.user.username} -> ${projectId}`);
      
      // Send immediate callback
      if (callback) {
        console.log(`📤 SENDING LEAVE SUCCESS CALLBACK`);
        callback({
          success: true,
          projectId,
          timestamp: new Date().toISOString()
        });
      }

      try {
        if (!projectId) {
          console.log(`❌ LEAVE ERROR: No project ID`);
          return;
        }

        const roomName = `project:${projectId}`;
        socket.leave(roomName);

        // Notify others in the room that user left
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

      } catch (error) {
        console.error("❌ LEAVE ERROR:", error);
      }
    });

    // DISCONNECT
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected: ${socket.user.username} (${socket.id}) - ${reason}`);
    });

    // ERROR HANDLING
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.user.username}:`, error);
    });
  });

  console.log("✅ Chat socket handlers registered");
};