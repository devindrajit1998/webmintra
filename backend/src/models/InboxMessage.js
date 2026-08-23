import mongoose from "mongoose";

export const INBOX_STATUSES = ["unread", "read", "replied", "archived", "spam"];
export const INBOX_CATEGORIES = ["general", "support", "sales_inquiry", "billing", "feedback"];

const inboxReplySchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, default: "Support Team" },
    authorEmail: { type: String, default: "support@webmintra.in" },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true },
    textBody: { type: String },
    sentAt: { type: Date, default: Date.now },
    providerMessageId: { type: String },
  },
  { timestamps: true }
);

const inboxMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, index: true }, // RFC 2822 Message-ID or provider ID
    fromEmail: { type: String, required: true, trim: true, index: true },
    fromName: { type: String, trim: true, default: "" },
    toEmail: { type: String, required: true, trim: true, default: "support@webmintra.in", index: true },
    replyTo: { type: String, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    htmlBody: { type: String, default: "" },
    textBody: { type: String, default: "" },
    status: { type: String, enum: INBOX_STATUSES, default: "unread", index: true },
    category: { type: String, enum: INBOX_CATEGORIES, default: "support", index: true },
    isStarred: { type: Boolean, default: false, index: true },
    
    // Connected entities (if detected from email)
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    
    // Attachments
    attachments: [
      {
        filename: String,
        contentType: String,
        size: Number,
        url: String,
      },
    ],
    
    // Thread replies sent by admin
    replies: [inboxReplySchema],
    
    // Headers and raw payload metadata
    headers: { type: Map, of: String },
    receivedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

inboxMessageSchema.index({ status: 1, receivedAt: -1 });
inboxMessageSchema.index({ fromEmail: 1, receivedAt: -1 });

export const InboxMessage = mongoose.model("InboxMessage", inboxMessageSchema);
