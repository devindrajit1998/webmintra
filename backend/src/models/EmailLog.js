import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, index: true },
    type: { type: String, index: true }, // e.g. "otp", "welcome"
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailTemplate" },
    subject: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed"], required: true, index: true },
    error: { type: String },
  },
  { timestamps: true }
);

export const EmailLog = mongoose.model("EmailLog", emailLogSchema);
