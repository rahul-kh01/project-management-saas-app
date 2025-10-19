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

// Check if user is a member of the project
const isProjectMember = async (userId, projectId) => {
  const membership = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });
  return !!membership;
};

export const setupChatSocket = (io) => {
  // Socket.IO namespace for chat
  const chatNamespace = io.of("/chat");

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const user = await verifySocketToken(token);

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
    socket.on("chat:join", async ({ projectId }) => {
      try {
        // Verify user is a project member
        const isMember = await isProjectMember(socket.user._id, projectId);

        if (!isMember) {
          socket.emit("chat:error", {
            message: "You are not a member of this project",
          });
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
        socket.emit("chat:joined", {
          projectId,
          message: "Successfully joined chat room",
        });
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("chat:error", {
          message: "Failed to join chat room",
        });
      }
    });

    // Send message
    socket.on("chat:message", async ({ projectId, body, tempId }) => {
      try {
        // Verify user is a project member
        const isMember = await isProjectMember(socket.user._id, projectId);

        if (!isMember) {
          socket.emit("chat:error", {
            message: "You are not a member of this project",
          });
          return;
        }

        // Validate message
        if (!body || !body.trim()) {
          socket.emit("chat:error", {
            message: "Message body is required",
          });
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
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("chat:error", {
          message: "Failed to send message",
        });
      }
    });

    // Typing indicator
    socket.on("chat:typing", async ({ projectId, isTyping }) => {
      try {
        // Verify user is a project member
        const isMember = await isProjectMember(socket.user._id, projectId);

        if (!isMember) {
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
      } catch (error) {
        console.error("Error handling typing:", error);
      }
    });

    // Mark message as seen
    socket.on("chat:seen", async ({ projectId, messageId }) => {
      try {
        // Verify user is a project member
        const isMember = await isProjectMember(socket.user._id, projectId);

        if (!isMember) {
          return;
        }

        // Find message
        const message = await ChatMessage.findById(messageId);

        if (!message) {
          socket.emit("chat:error", {
            message: "Message not found",
          });
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
      } catch (error) {
        console.error("Error marking message as seen:", error);
      }
    });

    // Leave project room
    socket.on("chat:leave", ({ projectId }) => {
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
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });

  console.log("Chat socket handlers registered");
};

