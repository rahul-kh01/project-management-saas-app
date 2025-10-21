import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ChatMessage } from "../models/chatmessage.models.js";
import { userCache, membershipCache } from "../utils/cache.js";

const verifySocketToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return await User.findById(decoded._id).select("-password -refreshToken");
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
};

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

    const isMember = Boolean(membership);
    membershipCache.set(cacheKey, isMember, 5 * 60 * 1000);
    return isMember;
  } catch (error) {
    console.error("Error checking project membership:", error.message);
    return false;
  }
};

const registerChatHandlers = (namespace) => {
  const label = namespace.name === "/" ? "default" : namespace.name;

  namespace.use(async (socket, next) => {
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

  namespace.on("connection", (socket) => {
    console.log(`🔌 User connected [${label}]: ${socket.user.username} (${socket.id})`);

    socket.on("chat:join", async (data = {}, callback) => {
      const { projectId } = data;
      console.log(`📥 JOIN REQUEST [${label}]: ${socket.user.username} -> ${projectId}`);

      try {
        if (!projectId) {
          const errorResponse = { error: "Project ID is required" };
          callback?.(errorResponse);
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          const errorResponse = { error: "Not a project member" };
          callback?.(errorResponse);
          return;
        }

        const roomName = `project:${projectId}`;
        await socket.join(roomName);

        const successResponse = {
          projectId,
          message: "Successfully joined chat room",
          success: true,
          timestamp: new Date().toISOString(),
        };

        callback?.(successResponse);

        socket.to(roomName).emit("chat:user-joined", {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar,
          },
          timestamp: new Date(),
        });

        socket.emit("chat:joined", successResponse);
      } catch (error) {
        console.error("❌ JOIN ERROR:", error);
        const errorResponse = {
          error: "Failed to join chat room",
          details: error.message,
        };
        callback?.(errorResponse);
        socket.emit("chat:error", errorResponse);
      }
    });

    socket.on("chat:message", async (data = {}, callback) => {
      const { projectId, body, tempId } = data;

      try {
        if (!projectId || !body) {
          const errorResponse = { error: "Project ID and message body are required" };
          callback?.(errorResponse);
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          const errorResponse = { error: "Not a project member" };
          callback?.(errorResponse);
          return;
        }

        const message = await ChatMessage.create({
          project: new mongoose.Types.ObjectId(projectId),
          sender: new mongoose.Types.ObjectId(socket.user._id),
          body: body.trim(),
          readBy: [new mongoose.Types.ObjectId(socket.user._id)],
        });

        const populatedMessage = await ChatMessage.findById(message._id).populate(
          "sender",
          "username fullName avatar"
        );

        const successResponse = {
          messageId: message._id,
          tempId,
          success: true,
          timestamp: new Date().toISOString(),
        };

        callback?.(successResponse);

        const roomName = `project:${projectId}`;
        namespace.to(roomName).emit("chat:new-message", {
          message: populatedMessage,
          tempId,
        });
      } catch (error) {
        console.error("❌ MESSAGE ERROR:", error);
        const errorResponse = {
          error: "Failed to send message",
          details: error.message,
        };
        callback?.(errorResponse);
        socket.emit("chat:error", errorResponse);
      }
    });

    socket.on("chat:typing", async (data = {}, callback) => {
      const { projectId, isTyping } = data;

      try {
        if (!projectId) {
          const errorResponse = { error: "Project ID is required" };
          callback?.(errorResponse);
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          const errorResponse = { error: "Not a project member" };
          callback?.(errorResponse);
          return;
        }

        const roomName = `project:${projectId}`;
        socket.to(roomName).emit("chat:user-typing", {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar,
          },
          isTyping,
          timestamp: new Date(),
        });

        const successResponse = {
          success: true,
          isTyping,
          timestamp: new Date().toISOString(),
        };
        callback?.(successResponse);
      } catch (error) {
        console.error("❌ TYPING ERROR:", error);
        const errorResponse = {
          error: "Failed to handle typing",
          details: error.message,
        };
        callback?.(errorResponse);
      }
    });

    socket.on("chat:seen", async (data = {}, callback) => {
      const { projectId, messageId } = data;

      try {
        if (!projectId || !messageId) {
          const errorResponse = { error: "Project ID and Message ID are required" };
          callback?.(errorResponse);
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          const errorResponse = { error: "Not a project member" };
          callback?.(errorResponse);
          return;
        }

        const message = await ChatMessage.findById(messageId);
        if (!message) {
          const errorResponse = { error: "Message not found" };
          callback?.(errorResponse);
          return;
        }

        const userId = socket.user._id.toString();
        const alreadyRead = message.readBy.some((id) => id.toString() === userId);

        if (!alreadyRead) {
          message.readBy.push(new mongoose.Types.ObjectId(socket.user._id));
          await message.save();

          const roomName = `project:${projectId}`;
          namespace.to(roomName).emit("chat:message-seen", {
            messageId,
            userId: socket.user._id,
            username: socket.user.username,
            timestamp: new Date(),
          });
        }

        const successResponse = {
          success: true,
          messageId,
          timestamp: new Date().toISOString(),
        };
        callback?.(successResponse);
      } catch (error) {
        console.error("❌ SEEN ERROR:", error);
        const errorResponse = {
          error: "Failed to mark as seen",
          details: error.message,
        };
        callback?.(errorResponse);
      }
    });

    socket.on("chat:leave", async (data = {}, callback) => {
      const { projectId } = data;

      try {
        if (!projectId) {
          const errorResponse = { error: "Project ID is required" };
          callback?.(errorResponse);
          return;
        }

        const roomName = `project:${projectId}`;
        socket.leave(roomName);

        socket.to(roomName).emit("chat:user-left", {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            fullName: socket.user.fullName,
            avatar: socket.user.avatar,
          },
          timestamp: new Date(),
        });

        const successResponse = {
          success: true,
          projectId,
          timestamp: new Date().toISOString(),
        };
        callback?.(successResponse);
      } catch (error) {
        console.error("❌ LEAVE ERROR:", error);
        const errorResponse = {
          error: "Failed to leave room",
          details: error.message,
        };
        callback?.(errorResponse);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected [${label}]: ${socket.user.username} (${socket.id}) - ${reason}`);
    });

    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.user.username} [${label}]:`, error);
    });
  });

  console.log(`✅ Chat handlers ready for namespace [${label}]`);
};

export const setupChatSocket = (io) => {
  console.log("🔧 Setting up CHAT socket handlers...");

  const namespaces = [io.of("/chat"), io];
  namespaces.forEach((namespace) => registerChatHandlers(namespace));

  console.log("✅ Chat socket handlers registered");
};
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

    // JOIN PROJECT ROOM - FIXED VERSION
    socket.on("chat:join", async (data, callback) => {
      console.log(`🚀 CHAT:JOIN EVENT RECEIVED!!!`);
      const { projectId } = data;
      console.log(`📥 JOIN REQUEST: ${socket.user.username} -> ${projectId}`);
      console.log(`📊 Callback provided: ${!!callback}`);
      
      try {
        if (!projectId) {
          console.log(`❌ JOIN ERROR: No project ID`);
          const errorResponse = { error: "Project ID is required" };
          if (callback) {
            console.log(`📤 CALLING CALLBACK WITH ERROR (no project ID)`);
            callback(errorResponse);
          }
          return;
        }

        console.log(`🔍 Checking membership for user ${socket.user._id} in project ${projectId}`);
        const isMember = await isProjectMember(socket.user._id, projectId);
        console.log(`🔍 MEMBERSHIP CHECK RESULT: ${isMember ? 'MEMBER' : 'NOT MEMBER'}`);

        if (!isMember) {
          console.log(`❌ JOIN DENIED: Not a project member`);
          const errorResponse = { error: "Not a project member" };
          if (callback) {
            console.log(`📤 CALLING CALLBACK WITH ERROR (not member)`);
            callback(errorResponse);
          }
          return;
        }

        const roomName = `project:${projectId}`;
        await socket.join(roomName);
        console.log(`✅ JOINED ROOM: ${roomName}`);

        // Send success callback AFTER successful join
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
    });

    // SEND MESSAGE - FIXED VERSION
    socket.on("chat:message", async (data, callback) => {
      const { projectId, body, tempId } = data;
      console.log(`📥 MESSAGE REQUEST: ${socket.user.username} -> ${body}`);
      
      try {
        if (!projectId || !body) {
          console.log(`❌ MESSAGE ERROR: Missing data`);
          const errorResponse = { error: "Project ID and message body are required" };
          if (callback) {
            callback(errorResponse);
          }
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          console.log(`❌ MESSAGE DENIED: Not a project member`);
          const errorResponse = { error: "Not a project member" };
          if (callback) {
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

        // Send success callback AFTER successful message creation
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
        namespace.to(roomName).emit("chat:new-message", {
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
    });

    // TYPING INDICATOR - FIXED VERSION
    socket.on("chat:typing", async (data, callback) => {
      const { projectId, isTyping } = data;
      console.log(`📥 TYPING REQUEST: ${socket.user.username} -> ${isTyping}`);
      
      try {
        if (!projectId) {
          console.log(`❌ TYPING ERROR: No project ID`);
          const errorResponse = { error: "Project ID is required" };
          if (callback) {
            callback(errorResponse);
          }
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          console.log(`❌ TYPING DENIED: Not a project member`);
          const errorResponse = { error: "Not a project member" };
          if (callback) {
            callback(errorResponse);
          }
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

        // Send success callback AFTER successful broadcast
        const successResponse = {
          success: true,
          isTyping,
          timestamp: new Date().toISOString()
        };
        
        if (callback) {
          console.log(`📤 SENDING TYPING SUCCESS CALLBACK`);
          callback(successResponse);
        }

        console.log(`✅ TYPING BROADCAST: ${isTyping}`);

      } catch (error) {
        console.error("❌ TYPING ERROR:", error);
        const errorResponse = {
          error: "Failed to handle typing",
          details: error.message
        };
        if (callback) {
          callback(errorResponse);
        }
      }
    });

    // MARK AS SEEN - FIXED VERSION
    socket.on("chat:seen", async (data, callback) => {
      const { projectId, messageId } = data;
      console.log(`📥 SEEN REQUEST: ${socket.user.username} -> ${messageId}`);
      
      try {
        if (!projectId || !messageId) {
          console.log(`❌ SEEN ERROR: Missing data`);
          const errorResponse = { error: "Project ID and Message ID are required" };
          if (callback) {
            callback(errorResponse);
          }
          return;
        }

        const isMember = await isProjectMember(socket.user._id, projectId);
        if (!isMember) {
          console.log(`❌ SEEN DENIED: Not a project member`);
          const errorResponse = { error: "Not a project member" };
          if (callback) {
            callback(errorResponse);
          }
          return;
        }

        const message = await ChatMessage.findById(messageId);
        if (!message) {
          console.log(`❌ SEEN ERROR: Message not found`);
          const errorResponse = { error: "Message not found" };
          if (callback) {
            callback(errorResponse);
          }
          return;
        }

        const userId = socket.user._id.toString();
        const alreadyRead = message.readBy.some(id => id.toString() === userId);

        if (!alreadyRead) {
          message.readBy.push(new mongoose.Types.ObjectId(socket.user._id));
          await message.save();

          const roomName = `project:${projectId}`;
          
          // Broadcast to all users in the room
          namespace.to(roomName).emit("chat:message-seen", {
            messageId,
            userId: socket.user._id,
            username: socket.user.username,
            timestamp: new Date()
          });

          console.log(`✅ SEEN BROADCAST: ${messageId}`);
        } else {
          console.log(`ℹ️ SEEN ALREADY READ: ${messageId}`);
        }

        // Send success callback AFTER processing
        const successResponse = {
          success: true,
          messageId,
          timestamp: new Date().toISOString()
        };
        
        if (callback) {
          console.log(`📤 SENDING SEEN SUCCESS CALLBACK`);
          callback(successResponse);
        }

      } catch (error) {
        console.error("❌ SEEN ERROR:", error);
        const errorResponse = {
          error: "Failed to mark as seen",
          details: error.message
        };
        if (callback) {
          callback(errorResponse);
        }
      }
    });

    // LEAVE PROJECT ROOM - FIXED VERSION
    socket.on("chat:leave", async (data, callback) => {
      const { projectId } = data;
      console.log(`📥 LEAVE REQUEST: ${socket.user.username} -> ${projectId}`);
      
      try {
        if (!projectId) {
          console.log(`❌ LEAVE ERROR: No project ID`);
          const errorResponse = { error: "Project ID is required" };
          if (callback) {
            callback(errorResponse);
          }
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

        // Send success callback AFTER successful leave
        const successResponse = {
          success: true,
          projectId,
          timestamp: new Date().toISOString()
        };
        
        if (callback) {
          console.log(`📤 SENDING LEAVE SUCCESS CALLBACK`);
          callback(successResponse);
        }

      } catch (error) {
        console.error("❌ LEAVE ERROR:", error);
        const errorResponse = {
          error: "Failed to leave room",
          details: error.message
        };
        if (callback) {
          callback(errorResponse);
        }
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