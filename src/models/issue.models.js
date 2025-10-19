import mongoose, { Schema } from "mongoose";
import {
  AvailableIssueTypes,
  AvailableIssuePriorities,
  AvailableIssueStatuses,
  IssueTypeEnum,
  IssuePriorityEnum,
  IssueStatusEnum,
} from "../utils/constants.js";

const issueSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: AvailableIssueTypes,
      default: IssueTypeEnum.TASK,
      index: true,
    },
    priority: {
      type: String,
      enum: AvailableIssuePriorities,
      default: IssuePriorityEnum.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: AvailableIssueStatuses,
      default: IssueStatusEnum.BACKLOG,
      index: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    labels: {
      type: [String],
      default: [],
      index: true,
    },
    watchers: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    attachments: {
      type: [
        {
          url: String,
          name: String,
          mimeType: String,
          size: Number,
        },
      ],
      default: [],
    },
    dueDate: {
      type: Date,
    },
    storyPoints: {
      type: Number,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index for unique key per project
issueSchema.index({ projectId: 1, key: 1 }, { unique: true });

// Text index for search
issueSchema.index({ title: "text", description: "text" });

export const Issue = mongoose.model("Issue", issueSchema);

