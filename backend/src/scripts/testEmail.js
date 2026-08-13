import mongoose from "mongoose";
import "dotenv/config";
import { EmailTemplate } from "../models/EmailTemplate.js";

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  
  try {
    const templates = await EmailTemplate.find({})
      .sort({ type: 1, isDefault: -1 })
      .populate("createdBy", "name email")
      .lean();
    console.log("GET / templates successful", templates.length);
  } catch (err) {
    console.error("GET / templates failed", err);
  }

  try {
    const t = await EmailTemplate.findOne();
    if (t) {
      console.log("Found template", t._id);
    }
  } catch (err) {
    console.error("GET variables failed", err);
  }
  
  process.exit(0);
}
test();
