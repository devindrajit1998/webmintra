import mongoose from "mongoose";
import "dotenv/config";
import { TemplateCategory } from "../models/TemplateCategory.js";

const categories = [
  "Business",
  "Portfolio",
  "E-Commerce",
  "Blog",
  "Restaurant",
  "Agency",
  "Health & Wellness",
  "Photography",
  "Event",
  "Technology"
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database.");

    for (const name of categories) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const existing = await TemplateCategory.findOne({ slug });
      
      if (!existing) {
        await TemplateCategory.create({ name, slug });
        console.log(`Created category: ${name}`);
      } else {
        console.log(`Category already exists: ${name}`);
      }
    }

    console.log("Seeding complete.");
  } catch (error) {
    console.error("Error seeding categories:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
