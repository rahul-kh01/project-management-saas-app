import mongoose, { Schema } from "mongoose";

const issueCommentSchema = new Schema(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

export const IssueComment = mongoose.model("IssueComment", issueCommentSchema);

