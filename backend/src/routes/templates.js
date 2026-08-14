import { Router } from "express";
import { Template } from "../models/Template.js";

const router = Router();

router.get("/", async (_request, response, next) => {
    try {
        const templates = await Template.find({ isActive: true })
            .sort({ pageCount: 1, title: 1 })
            .select("title description category pageCount thumbnailUrl")
            .lean();

        return response.json({
            templates: templates.map((template) => ({
                id: template._id,
                name: template.title,
                category: template.category,
                description: template.description || "",
                pageCount: template.pageCount || 1,
                thumbnailUrl: template.thumbnailUrl || null,
            })),
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
