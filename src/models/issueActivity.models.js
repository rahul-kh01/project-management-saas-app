import mongoose, { Schema } from "mongoose";

const issueActivitySchema = new Schema(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    from: {
      type: Schema.Types.Mixed,
    },
    to: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const IssueActivity = mongoose.model(
  "IssueActivity",
  issueActivitySchema
);

