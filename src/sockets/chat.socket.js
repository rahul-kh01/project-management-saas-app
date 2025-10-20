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
    return null;
  }
};

// Check if user is a member of the project (with caching)
const isProjectMember = async (userId, projectId, membershipCache) => {
  const cacheKey = `${userId}-${projectId}`;
  
  // Check cache first
  if (membershipCache.has(cacheKey)) {
    return membershipCache.get(cacheKey);
  }

  const membership = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });
  
  const isMember = !!membership;
  
  // Cache result for 2 minutes
  membershipCache.set(cacheKey, isMember);
  setTimeout(() => membershipCache.delete(cacheKey), 2 * 60 * 1000);
  
  return isMember;
};

export const setupChatSocket = (io) => {
  // Socket.IO namespace for chat
  const chatNamespace = io.of("/chat");

  // Optimize middleware with caching
  const userCache = new Map();
  const membershipCache = new Map();

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Check cache first
      let user = userCache.get(token);
      if (!user) {
        user = await verifySocketToken(token);
        if (user) {
          // Cache user for 5 minutes
          userCache.set(token, user);
          setTimeout(() => userCache.delete(token), 5 * 60 * 1000);
        }
      }

      if (!user) {
        return next(new Error("Invalid authentication token"));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  chatNamespace.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Join project room
    socket.on("chat:join", async ({ projectId }, callback) => {
      try {
        // Verify user is a project member (with caching)
        const isMember = await isProjectMember(socket.user._id, projectId, membershipCache);

        if (!isMember) {
          const errorResponse = {
            error: "You are not a member of this project"
          };
          socket.emit("chat:error", errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Join the project room
        const roomName = `project:${projectId}`;
        socket.join(roomName);

        console.log(
          `${socket.user.username} joined room: ${roomName}`
        );

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
        };
        socket.emit("chat:joined", successResponse);
        if (callback) callback(successResponse);
      } catch (error) {
        console.error("Error joining room:", error);
        const errorResponse = {
          error: "Failed to join chat room"
        };
        socket.emit("chat:error", errorResponse);
        if (callback) callback(errorResponse);
      }
    });

    // Send message
    socket.on("chat:message", async ({ projectId, body, tempId }, callback) => {
      try {
        // Verify user is a project member (with caching)
        const isMember = await isProjectMember(socket.user._id, projectId, membershipCache);

        if (!isMember) {
          const errorResponse = {
            error: "You are not a member of this project"
          };
          socket.emit("chat:error", errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Validate message
        if (!body || !body.trim()) {
          const errorResponse = {
            error: "Message body is required"
          };
          socket.emit("chat:error", errorResponse);
          if (callback) callback(errorResponse);
          return;
        }

        // Create message in database
        const message = await ChatMessage.create({
          project: new mongoose.Types.ObjectId(projectId),
          sender: new mongoose.Types.ObjectId(socket.user._id),
          body,
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

        console.log(
          `Message sent in ${roomName} by ${socket.user.username}`
        );

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
          error: "Failed to send message"
        };
        socket.emit("chat:error", errorResponse);
        if (callback) callback(errorResponse);
      }
    });

    // Typing indicator
    socket.on("chat:typing", async ({ projectId, isTyping }, callback) => {
      try {
        // Verify user is a project member (with caching)
        const isMember = await isProjectMember(socket.user._id, projectId, membershipCache);

        if (!isMember) {
          const errorResponse = { error: "Not a project member" };
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
          },
          isTyping,
        });

        // Acknowledge typing status
        const successResponse = { success: true, isTyping };
        if (callback) callback(successResponse);
      } catch (error) {
        console.error("Error handling typing:", error);
        const errorResponse = { error: "Failed to handle typing" };
        if (callback) callback(errorResponse);
      }
    });

    // Mark message as seen
    socket.on("chat:seen", async ({ projectId, messageId }, callback) => {
      try {
        // Verify user is a project member (with caching)
        const isMember = await isProjectMember(socket.user._id, projectId, membershipCache);

        if (!isMember) {
          const errorResponse = { error: "Not a project member" };
          if (callback) callback(errorResponse);
          return;
        }

        // Find message
        const message = await ChatMessage.findById(messageId);

        if (!message) {
          const errorResponse = { error: "Message not found" };
          socket.emit("chat:error", errorResponse);
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
        }

        // Acknowledge seen status
        const successResponse = { success: true, messageId };
        if (callback) callback(successResponse);
      } catch (error) {
        console.error("Error marking message as seen:", error);
        const errorResponse = { error: "Failed to mark as seen" };
        if (callback) callback(errorResponse);
      }
    });

    // Leave project room
    socket.on("chat:leave", ({ projectId }, callback) => {
      try {
        const roomName = `project:${projectId}`;
        socket.leave(roomName);

        // Notify others in the room
        socket.to(roomName).emit("chat:user-left", {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
          },
          timestamp: new Date(),
        });

        console.log(`${socket.user.username} left room: ${roomName}`);

        // Acknowledge leave
        const successResponse = { success: true, projectId };
        if (callback) callback(successResponse);
      } catch (error) {
        console.error("Error leaving room:", error);
        const errorResponse = { error: "Failed to leave room" };
        if (callback) callback(errorResponse);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });

  console.log("Chat socket handlers registered");
};

