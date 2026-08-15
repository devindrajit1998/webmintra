import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    authorName: { type: String, required: true, trim: true, maxlength: 100 },
    roleOrTitle: { type: String, trim: true, maxlength: 120, default: "" },      // e.g. "Gym Owner" or "Partner"
    businessName: { type: String, trim: true, maxlength: 120, default: "" },     // e.g. "Pulse Fitness"
    location: { type: String, trim: true, maxlength: 100, default: "India" },     // e.g. "Kolkata", "Delhi"
    quote: { type: String, required: true, trim: true, maxlength: 1000 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    avatarUrl: { type: String, trim: true, default: "" },
    businessLogoUrl: { type: String, trim: true, default: "" },
    websiteUrl: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "General" },                 // e.g. "Gym", "Healthcare", "CA"
    isFeatured: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

testimonialSchema.index({ isActive: 1, sortOrder: 1 });

export const Testimonial = mongoose.model("Testimonial", testimonialSchema);

export const DEFAULT_TESTIMONIALS = [
  {
    authorName: "Rohit Sharma",
    roleOrTitle: "Gym Owner",
    businessName: "Pulse Fitness Club",
    location: "Kolkata",
    quote: "I launched our gym website in one evening. When we updated our membership pricing last week, I did it myself in 2 minutes from my phone.",
    rating: 5,
    avatarUrl: "https://i.pravatar.cc/150?img=11",
    category: "Gym & Fitness",
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    authorName: "Dr. Priya Verma",
    roleOrTitle: "Chief Dentist",
    businessName: "Care Dental Clinic",
    location: "Delhi",
    quote: "We used to pay ₹1,500 every time we needed to update doctor availability. With WebMintra, we edit our clinic schedule directly without hassle.",
    rating: 5,
    avatarUrl: "https://i.pravatar.cc/150?img=47",
    category: "Healthcare",
    isFeatured: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    authorName: "Ankit Agarwal",
    roleOrTitle: "Senior Partner",
    businessName: "Agarwal & Associates",
    location: "Jaipur",
    quote: "Our accounting firm receives enquiries every week through our WebMintra contact form. Setup was seamless and domain connection took 5 minutes.",
    rating: 5,
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    category: "Financial & CA",
    isFeatured: true,
    isActive: true,
    sortOrder: 3,
  },
];
