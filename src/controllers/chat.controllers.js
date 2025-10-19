import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ChatMessage } from "../models/chatmessage.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";

const getMessages = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 50, before } = req.query;

  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Verify user is a project member
  const membership = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(req.user._id),
  });

  if (!membership) {
    throw new ApiError(403, "You are not a member of this project");
  }

  // Build query
  const query = {
    project: new mongoose.Types.ObjectId(projectId),
  };

  // If 'before' timestamp is provided, get messages before that time (for infinite scroll)
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await ChatMessage.countDocuments(query);

  // Get messages in reverse chronological order (newest first)
  const messages = await ChatMessage.find(query)
    .populate("sender", "username fullName avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Reverse the array to show oldest first in the UI
  const messagesOldestFirst = messages.reverse();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: messagesOldestFirst,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + messages.length < total,
      },
      "Messages fetched successfully"
    )
  );
});

const postMessage = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { body } = req.body;

  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Verify user is a project member
  const membership = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(req.user._id),
  });

  if (!membership) {
    throw new ApiError(403, "You are not a member of this project");
  }

  // Validate message has content
  if (!body || !body.trim()) {
    throw new ApiError(400, "Message body is required");
  }

  // Handle file attachments
  const files = req.files || [];
  const attachments = files.map((file) => ({
    url: `${process.env.SERVER_URL}/images/${file.filename}`,
    name: file.originalname,
    mime: file.mimetype,
    size: file.size,
  }));

  // Create message
  const message = await ChatMessage.create({
    project: new mongoose.Types.ObjectId(projectId),
    sender: new mongoose.Types.ObjectId(req.user._id),
    body,
    attachments,
    readBy: [new mongoose.Types.ObjectId(req.user._id)], // Sender has read their own message
  });

  // Populate sender info
  const populatedMessage = await ChatMessage.findById(message._id).populate(
    "sender",
    "username fullName avatar"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedMessage, "Message sent successfully"));
});

const markAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await ChatMessage.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  // Verify user is a project member
  const membership = await ProjectMember.findOne({
    project: message.project,
    user: new mongoose.Types.ObjectId(req.user._id),
  });

  if (!membership) {
    throw new ApiError(403, "You are not a member of this project");
  }

  // Add user to readBy if not already present
  const userId = req.user._id.toString();
  const alreadyRead = message.readBy.some((id) => id.toString() === userId);

  if (!alreadyRead) {
    message.readBy.push(new mongoose.Types.ObjectId(req.user._id));
    await message.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message marked as read"));
});

export { getMessages, postMessage, markAsRead };

