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
