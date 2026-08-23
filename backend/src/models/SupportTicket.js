import mongoose from "mongoose";

export const TICKET_STATUSES = ["open", "in_progress", "waiting_reply", "resolved", "closed"];
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"];

const ticketReplySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 5000 },
    isInternal: { type: Boolean, default: false },
    attachments: [{ url: String, filename: String, size: Number }],
  },
  { timestamps: true },
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true, required: true, trim: true, index: true },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    contactName: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: TICKET_STATUSES, default: "open", index: true },
    priority: { type: String, enum: TICKET_PRIORITIES, default: "medium", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    category: { type: String, trim: true, maxlength: 80, default: "" },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    replies: { type: [ticketReplySchema], default: [] },
    attachments: [{ url: String, filename: String, size: Number }],
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    lastRepliedAt: { type: Date },
    lastRepliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    firstResponseAt: { type: Date },
    satisfactionRating: { type: Number, min: 1, max: 5 },
    satisfactionFeedback: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

supportTicketSchema.index({ tenant: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });

// Generate the required number before Mongoose validates a new ticket.
supportTicketSchema.pre("validate", async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
