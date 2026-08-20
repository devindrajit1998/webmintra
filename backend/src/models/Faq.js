import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, trim: true, maxlength: 80, default: "General" },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

faqSchema.index({ isPublished: 1, sortOrder: 1 });

export const FAQ = mongoose.model("FAQ", faqSchema);

export const DEFAULT_FAQS = [
  {
    question: "Do I need any coding skills?",
    answer: "Zero coding or technical knowledge required. You can edit any text, image, price, or button just by clicking on it.",
    category: "General",
    isPublished: true,
    sortOrder: 1,
  },
  {
    question: "Can I change my template later?",
    answer: "Yes, you can switch or customize your template layout at any point from your dashboard.",
    category: "Design",
    isPublished: true,
    sortOrder: 2,
  },
  {
    question: "Can I use my own domain name?",
    answer: "Yes! You can connect any custom .in, .com, or .org domain with 1-click DNS connection.",
    category: "Domain & Hosting",
    isPublished: true,
    sortOrder: 3,
  },
  {
    question: "Will my website work on mobile devices?",
    answer: "Every template is 100% mobile-optimized and responsive out of the box for smartphones, tablets, and desktops.",
    category: "Mobile",
    isPublished: true,
    sortOrder: 4,
  },
  {
    question: "Is hosting included?",
    answer: "Yes, high-speed managed cloud hosting with automated SSL encryption and daily backups is included in every plan.",
    category: "Domain & Hosting",
    isPublished: true,
    sortOrder: 5,
  },
  {
    question: "Do you offer customer support?",
    answer: "Yes! We offer 24/7 dedicated support via WhatsApp, email, and live ticket desk across India.",
    category: "Support",
    isPublished: true,
    sortOrder: 6,
  },
];
