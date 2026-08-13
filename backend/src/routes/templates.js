import { Router } from "express";
import { TEMPLATE_CATALOG } from "../lib/template-catalog.js";

const router = Router();

router.get("/", (_request, response) => response.json({ templates: TEMPLATE_CATALOG }));

export default router;
