import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { Issue } from "../models/issue.models.js";
import { IssueComment } from "../models/issueComment.models.js";
import { IssueActivity } from "../models/issueActivity.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { STATUS_TRANSITIONS } from "../utils/constants.js";

// Helper function to generate sequential issue key
const generateIssueKey = async (projectId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Get the project name abbreviation (first 3 letters uppercase)
  const projectKey = project.name.substring(0, 3).toUpperCase();

  // Find the highest issue number for this project
  const lastIssue = await Issue.findOne({ projectId })
    .sort({ createdAt: -1 })
    .select("key");

  let issueNumber = 1;
  if (lastIssue && lastIssue.key) {
    const parts = lastIssue.key.split("-");
    if (parts.length === 2) {
      issueNumber = parseInt(parts[1]) + 1;
    }
  }

  return `${projectKey}-${issueNumber}`;
};

// Helper function to log activity
const logActivity = async (issueId, actorId, action, from, to) => {
  try {
    await IssueActivity.create({
      issueId: new mongoose.Types.ObjectId(issueId),
      actorId: new mongoose.Types.ObjectId(actorId),
      action,
      from,
      to,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

// Helper to send notifications (fail-safe)
const sendNotification = async (issue, action, userId) => {
  try {
    // Import mail utility if it exists
    // This is fail-safe - if mail fails, it won't block the main flow
    const recipients = new Set();
    
    if (issue.assignee) {
      recipients.add(issue.assignee.toString());
    }
    
    issue.watchers.forEach((watcher) => {
      recipients.add(watcher.toString());
    });
    
    // Remove the actor from recipients
    recipients.delete(userId.toString());
    
    // TODO: Implement actual email sending using src/utils/mail.js
    // For now, just log
    if (recipients.size > 0) {
      console.log(`Notification: ${action} on ${issue.key} to ${recipients.size} users`);
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};

const listIssues = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    type,
    status,
    priority,
    assignee,
    labels,
    search,
    page = 1,
    limit = 50,
    sort = "-createdAt",
  } = req.query;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Build query
  const query = {
    projectId: new mongoose.Types.ObjectId(projectId),
    deletedAt: { $exists: false },
  };

  if (type) {
    query.type = Array.isArray(type) ? { $in: type } : type;
  }

  if (status) {
    query.status = Array.isArray(status) ? { $in: status } : status;
  }

  if (priority) {
    query.priority = Array.isArray(priority) ? { $in: priority } : priority;
  }

  if (assignee) {
    query.assignee = new mongoose.Types.ObjectId(assignee);
  }

  if (labels && labels.length > 0) {
    query.labels = { $in: Array.isArray(labels) ? labels : [labels] };
  }

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Issue.countDocuments(query);

  const issues = await Issue.find(query)
    .populate("assignee", "username fullName avatar")
    .populate("reporter", "username fullName avatar")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: issues,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + issues.length < total,
      },
      "Issues fetched successfully"
    )
  );
});

const createIssue = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    title,
    description,
    type,
    priority,
    status,
    assignee,
    labels,
    dueDate,
    storyPoints,
  } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Generate unique issue key
  const key = await generateIssueKey(projectId);

  // Handle file attachments
  const files = req.files || [];
  const attachments = files.map((file) => ({
    url: `${process.env.SERVER_URL}/images/${file.filename}`,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

  const issue = await Issue.create({
    projectId: new mongoose.Types.ObjectId(projectId),
    key,
    title,
    description: description || "",
    type,
    priority,
    status,
    assignee: assignee ? new mongoose.Types.ObjectId(assignee) : undefined,
    reporter: new mongoose.Types.ObjectId(req.user._id),
    labels: labels || [],
    watchers: [new mongoose.Types.ObjectId(req.user._id)],
    attachments,
    dueDate,
    storyPoints,
  });

  // Log activity
  await logActivity(issue._id, req.user._id, "created", null, null);

  // Send notifications
  await sendNotification(issue, "created", req.user._id);

  const populatedIssue = await Issue.findById(issue._id)
    .populate("assignee", "username fullName avatar")
    .populate("reporter", "username fullName avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedIssue, "Issue created successfully"));
});

const getIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    deletedAt: { $exists: false },
  })
    .populate("assignee", "username fullName avatar")
    .populate("reporter", "username fullName avatar")
    .populate("watchers", "username fullName avatar");

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  // Get latest 20 comments
  const comments = await IssueComment.find({
    issueId: new mongoose.Types.ObjectId(issueId),
  })
    .populate("authorId", "username fullName avatar")
    .sort({ createdAt: -1 })
    .limit(20);

  // Get latest 20 activities
  const activities = await IssueActivity.find({
    issueId: new mongoose.Types.ObjectId(issueId),
  })
    .populate("actorId", "username fullName avatar")
    .sort({ createdAt: -1 })
    .limit(20);

  // Get counts
  const commentCount = await IssueComment.countDocuments({
    issueId: new mongoose.Types.ObjectId(issueId),
  });

  const activityCount = await IssueActivity.countDocuments({
    issueId: new mongoose.Types.ObjectId(issueId),
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        issue,
        comments,
        activities,
        commentCount,
        activityCount,
      },
      "Issue fetched successfully"
    )
  );
});

const updateIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;
  const {
    title,
    description,
    type,
    priority,
    assignee,
    labels,
    dueDate,
    storyPoints,
  } = req.body;

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    deletedAt: { $exists: false },
  });

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  // Track changes for activity log
  const changes = [];

  if (title !== undefined && title !== issue.title) {
    changes.push({ field: "title", from: issue.title, to: title });
    issue.title = title;
  }

  if (description !== undefined && description !== issue.description) {
    changes.push({
      field: "description",
      from: issue.description,
      to: description,
    });
    issue.description = description;
  }

  if (type !== undefined && type !== issue.type) {
    changes.push({ field: "type", from: issue.type, to: type });
    issue.type = type;
  }

  if (priority !== undefined && priority !== issue.priority) {
    changes.push({ field: "priority", from: issue.priority, to: priority });
    issue.priority = priority;
  }

  if (assignee !== undefined) {
    const newAssignee = assignee ? new mongoose.Types.ObjectId(assignee) : null;
    if (
      (issue.assignee && !newAssignee) ||
      (!issue.assignee && newAssignee) ||
      (issue.assignee &&
        newAssignee &&
        issue.assignee.toString() !== newAssignee.toString())
    ) {
      changes.push({
        field: "assignee",
        from: issue.assignee,
        to: newAssignee,
      });
      issue.assignee = newAssignee;
    }
  }

  if (labels !== undefined) {
    const oldLabels = issue.labels || [];
    const newLabels = labels || [];
    const added = newLabels.filter((l) => !oldLabels.includes(l));
    const removed = oldLabels.filter((l) => !newLabels.includes(l));

    if (added.length > 0) {
      added.forEach((label) => {
        changes.push({ field: "label_added", from: null, to: label });
      });
    }

    if (removed.length > 0) {
      removed.forEach((label) => {
        changes.push({ field: "label_removed", from: label, to: null });
      });
    }

    issue.labels = newLabels;
  }

  if (dueDate !== undefined && dueDate !== issue.dueDate) {
    changes.push({ field: "dueDate", from: issue.dueDate, to: dueDate });
    issue.dueDate = dueDate;
  }

  if (storyPoints !== undefined && storyPoints !== issue.storyPoints) {
    changes.push({
      field: "storyPoints",
      from: issue.storyPoints,
      to: storyPoints,
    });
    issue.storyPoints = storyPoints;
  }

  await issue.save();

  // Log activities for each change
  for (const change of changes) {
    await logActivity(
      issue._id,
      req.user._id,
      `${change.field}_changed`,
      change.from,
      change.to
    );
  }

  // Send notifications if there were changes
  if (changes.length > 0) {
    await sendNotification(issue, "updated", req.user._id);
  }

  const updatedIssue = await Issue.findById(issue._id)
    .populate("assignee", "username fullName avatar")
    .populate("reporter", "username fullName avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedIssue, "Issue updated successfully"));
});

const deleteIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    deletedAt: { $exists: false },
  });

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  // Soft delete
  issue.deletedAt = new Date();
  await issue.save();

  await logActivity(issue._id, req.user._id, "deleted", null, null);

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "Issue deleted successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { issueId } = req.params;
  const { body } = req.body;

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    deletedAt: { $exists: false },
  });

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  // Handle file attachments
  const files = req.files || [];
  const attachments = files.map((file) => ({
    url: `${process.env.SERVER_URL}/images/${file.filename}`,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

  const comment = await IssueComment.create({
    issueId: new mongoose.Types.ObjectId(issueId),
    authorId: new mongoose.Types.ObjectId(req.user._id),
    body,
    attachments,
  });

  await logActivity(issue._id, req.user._id, "comment_added", null, comment._id);

  await sendNotification(issue, "commented", req.user._id);

  const populatedComment = await IssueComment.findById(comment._id).populate(
    "authorId",
    "username fullName avatar"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedComment, "Comment added successfully"));
});

const listComments = asyncHandler(async (req, res) => {
  const { issueId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    deletedAt: { $exists: false },
  });

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await IssueComment.countDocuments({
    issueId: new mongoose.Types.ObjectId(issueId),
  });

  const comments = await IssueComment.find({
    issueId: new mongoose.Types.ObjectId(issueId),
  })
    .populate("authorId", "username fullName avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: comments,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: skip + comments.length < total,
      },
      "Comments fetched successfully"
    )
  );
});

const transitionIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;
  const { to } = req.body;

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    deletedAt: { $exists: false },
  });

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  const currentStatus = issue.status;
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(to)) {
    throw new ApiError(
      400,
      `Cannot transition from ${currentStatus} to ${to}. Allowed transitions: ${allowedTransitions.join(", ")}`
    );
  }

  issue.status = to;
  await issue.save();

  await logActivity(
    issue._id,
    req.user._id,
    "status_changed",
    currentStatus,
    to
  );

  await sendNotification(issue, "status changed", req.user._id);

  const updatedIssue = await Issue.findById(issue._id)
    .populate("assignee", "username fullName avatar")
    .populate("reporter", "username fullName avatar");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedIssue, "Issue status updated successfully")
    );
});

const watchIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    deletedAt: { $exists: false },
  });

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);

  if (issue.watchers.some((w) => w.toString() === userId.toString())) {
    throw new ApiError(400, "Already watching this issue");
  }

  issue.watchers.push(userId);
  await issue.save();

  await logActivity(issue._id, req.user._id, "started_watching", null, null);

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "Now watching this issue"));
});

const unwatchIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params;

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    deletedAt: { $exists: false },
  });

  if (!issue) {
    throw new ApiError(404, "Issue not found");
  }

  const userId = req.user._id.toString();

  issue.watchers = issue.watchers.filter((w) => w.toString() !== userId);
  await issue.save();

  await logActivity(issue._id, req.user._id, "stopped_watching", null, null);

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "Stopped watching this issue"));
});

export {
  listIssues,
  createIssue,
  getIssue,
  updateIssue,
  deleteIssue,
  addComment,
  listComments,
  transitionIssue,
  watchIssue,
  unwatchIssue,
};

