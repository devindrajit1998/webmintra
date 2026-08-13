import "dotenv/config";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { Plan } from "../models/Plan.js";
import { SEO_PLAN_DEFAULTS, SEO_PLAN_FEATURE_KEYS } from "../lib/seo-plan-features.js";

export function missingSeoPlanFeatures(plan) {
    const configured = plan?.seoFeatures && typeof plan.seoFeatures === "object"
        ? plan.seoFeatures
        : {};
    const defaults = SEO_PLAN_DEFAULTS[plan?.slug];
    if (!defaults) return {};

    return Object.fromEntries(
        SEO_PLAN_FEATURE_KEYS
            .filter((key) => configured[key] === undefined || configured[key] === null)
            .map((key) => [key, defaults[key]]),
    );
}

export async function seedSeoPlanEntitlements() {
    const plans = await Plan.find({ slug: { $in: Object.keys(SEO_PLAN_DEFAULTS) } })
        .select("slug seoFeatures")
        .lean();

    let updatedPlans = 0;
    let addedFeatures = 0;

    for (const plan of plans) {
        const missing = missingSeoPlanFeatures(plan);
        const entries = Object.entries(missing);
        if (!entries.length) continue;

        await Plan.updateOne(
            { _id: plan._id },
            { $set: Object.fromEntries(entries.map(([key, value]) => [`seoFeatures.${key}`, value])) },
        );
        updatedPlans += 1;
        addedFeatures += entries.length;
    }

    return { matchedPlans: plans.length, updatedPlans, addedFeatures };
}

async function main() {
    if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI.");
    await mongoose.connect(process.env.MONGODB_URI);
    try {
        const result = await seedSeoPlanEntitlements();
        console.log(`SEO plan entitlement defaults applied: ${JSON.stringify(result)}`);
    } finally {
        await mongoose.disconnect();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
