import mongoose, { Schema } from "mongoose";

const chatMessageSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      trim: true,
    },
    attachments: {
      type: [
        {
          url: String,
          mime: String,
          size: Number,
          name: String,
        },
      ],
      default: [],
    },
    readBy: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound index for efficient pagination within a project
chatMessageSchema.index({ project: 1, createdAt: -1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

