import "dotenv/config";
import mongoose from "mongoose";
import { KBArticle, KBCategory } from "../models/KnowledgeBase.js";
import { User } from "../models/User.js";

const categories = [
    {
        name: "Getting Started",
        slug: "getting-started",
        description: "Essential guidance for setting up a Webmintra workspace and launching a first website.",
        icon: "rocket",
        sortOrder: 10,
    },
    {
        name: "Domains & Publishing",
        slug: "domains-publishing",
        description: "Instructions for domains, DNS, publishing, and website availability.",
        icon: "globe",
        sortOrder: 20,
    },
    {
        name: "Billing & Account",
        slug: "billing-account",
        description: "Help with subscriptions, invoices, plans, and account management.",
        icon: "credit-card",
        sortOrder: 30,
    },
];

const articles = [
    {
        title: "Getting Started with Webmintra",
        slug: "getting-started-with-webmintra",
        categorySlug: "getting-started",
        excerpt: "Set up your business profile, understand the workspace, and prepare your account for building websites.",
        tags: ["getting started", "workspace", "business profile", "setup"],
        sortOrder: 10,
        seo: {
            title: "Getting Started with Webmintra",
            description: "Learn how to configure your Webmintra workspace and prepare to create your first website.",
        },
        content: `# Getting Started with Webmintra

Webmintra gives you one workspace for creating websites, managing domains, reviewing activity, and handling your subscription. Complete the initial setup before building your first site so your business information is available throughout the platform.

## 1. Complete your business profile

Open **Business** from the workspace navigation and add:

- Your business name
- A public contact email and phone number
- Your business address
- A short description of your services
- Your logo and favicon

Keep this information accurate because it can be reused in website templates and customer-facing pages.

## 2. Review your workspace

The dashboard summarizes your websites, domains, subscription, and recent activity. Use the main navigation to move between the website builder, pages, media, forms, analytics, and account settings.

## 3. Prepare your content

Before creating a website, collect your logo, brand colors, service descriptions, contact information, and images. Clear source content makes editing faster and keeps the finished website consistent.

## 4. Check your subscription

Open **Billing** to confirm your current plan and its limits. Plan limits can affect the number of websites, storage allowance, and available platform features.

## 5. Create your first website

Open **Websites**, select **Create Website**, choose a suitable template, and enter a recognizable website name. You can edit the generated site before publishing it.

## Recommended next step

Continue with **Creating and Publishing Your First Website** for a complete launch checklist.`,
    },
    {
        title: "Creating and Publishing Your First Website",
        slug: "creating-and-publishing-your-first-website",
        categorySlug: "getting-started",
        excerpt: "Create a website from a template, customize its pages, preview the result, and publish it safely.",
        tags: ["website", "builder", "template", "publish"],
        sortOrder: 20,
        seo: {
            title: "Create and Publish Your First Webmintra Website",
            description: "Follow the complete workflow for creating, editing, reviewing, and publishing a Webmintra website.",
        },
        content: `# Creating and Publishing Your First Website

A Webmintra website starts with a template and remains private until you publish it. Use the following workflow to prepare a complete site.

## 1. Create the website

Open **Websites** and choose **Create Website**. Enter a name that helps you identify the project, then select a template that matches the type of business you are building for.

## 2. Customize the design

Open the builder and update the main visual settings:

- Replace sample logos and images
- Apply your brand colors
- Adjust typography where needed
- Review button labels and links
- Remove sections that do not serve the website's goal

## 3. Update every page

Review each page from the page list. Replace placeholder text and confirm that navigation links point to the correct destinations. Pay special attention to the home, about, services, and contact pages.

## 4. Check mobile and desktop layouts

Use the builder preview modes to inspect common screen sizes. Confirm that headings wrap correctly, images remain visible, buttons are easy to select, and no content overlaps.

## 5. Verify forms and contact details

Submit each form once and confirm that the submission appears in **Forms**. Check all email addresses, telephone links, map locations, and social profile links.

## 6. Configure SEO

Open **SEO** and add a concise title and description for the site. Use a meaningful page heading and readable page content rather than repeating keywords.

## 7. Publish

Select **Publish** after the final review. Publishing makes the latest saved version available at the assigned Webmintra address or connected custom domain.

## After publishing

Open the live address in a new browser tab and test navigation, forms, and important links again. Future edits do not affect the live website until you publish the updated version.`,
    },
    {
        title: "Connecting a Custom Domain",
        slug: "connecting-a-custom-domain",
        categorySlug: "domains-publishing",
        excerpt: "Add a domain to Webmintra, configure the required DNS records, and verify the connection.",
        tags: ["domain", "dns", "custom domain", "ssl"],
        sortOrder: 30,
        seo: {
            title: "Connect a Custom Domain to Webmintra",
            description: "Learn how to add your custom domain, update DNS records, verify ownership, and publish securely.",
        },
        content: `# Connecting a Custom Domain

A custom domain gives your website a professional address such as **www.example.com**. You must own the domain and have access to its DNS settings.

## 1. Add the domain in Webmintra

Open **Domains**, choose **Add Domain**, and enter the domain without a protocol or path. For example, enter **example.com**, not **https://example.com/about**.

Select the website that should use the domain and save the configuration.

## 2. Copy the required DNS records

Webmintra displays the DNS records required for your domain. Open the DNS management area at your domain registrar or DNS provider and create those records exactly as shown.

Common records include:

- An A or CNAME record for the root domain
- A CNAME record for the **www** subdomain
- A TXT record used to verify domain ownership

Remove conflicting records for the same host when your provider does not allow multiple values.

## 3. Wait for DNS propagation

DNS changes are not always immediate. Many updates appear within minutes, but complete propagation can take up to 48 hours depending on the provider and previous TTL settings.

## 4. Verify the domain

Return to **Domains** and select **Verify**. If verification fails, compare the host and value fields with the records shown by Webmintra. Some providers automatically append the root domain, so a host may need to be entered as **@** or **www** rather than the full domain.

## 5. Confirm HTTPS

After DNS verification, SSL certificate provisioning begins automatically. The website may briefly show a pending state while the certificate is issued. Do not remove the DNS records during this process.

## Troubleshooting checklist

- Confirm that the domain spelling is correct
- Remove spaces from DNS values
- Check for conflicting A, AAAA, or CNAME records
- Disable proxying temporarily if your DNS provider supports a proxy mode
- Wait for propagation before repeatedly changing records

Once the status is active, open both the root and **www** versions of the domain and confirm they reach the correct website securely.`,
    },
    {
        title: "Managing Billing and Subscriptions",
        slug: "managing-billing-and-subscriptions",
        categorySlug: "billing-account",
        excerpt: "Understand your current plan, payment history, subscription changes, and what happens when billing fails.",
        tags: ["billing", "subscription", "payment", "invoice", "plan"],
        sortOrder: 40,
        seo: {
            title: "Manage Webmintra Billing and Subscriptions",
            description: "Review your Webmintra plan, payment history, subscription changes, and billing status.",
        },
        content: `# Managing Billing and Subscriptions

The billing area shows your current plan, subscription status, renewal information, and payment history.

## View your subscription

Open **Billing** or **Subscription** from the workspace navigation. Review the plan name, billing period, next renewal date, and current status.

A subscription can be active, trialing, past due, canceled, or expired. Features and limits are based on the currently active plan.

## Change your plan

Use the available plan controls to select a different subscription. Before confirming an upgrade or downgrade, review the included websites, storage, and feature limits.

Upgrades may take effect immediately. Downgrades can require you to reduce usage before the lower plan becomes active.

## Review payments

The payment history records completed, pending, and failed transactions. Open an individual payment to review its amount, date, payment provider reference, and status.

## Failed payments

If a renewal payment fails:

1. Confirm that the payment method has sufficient funds.
2. Check whether the bank requires additional authorization.
3. Retry the payment from a secure connection.
4. Avoid opening multiple payment windows at the same time.
5. Contact support with the payment reference if the amount was charged but the subscription was not updated.

Never send complete card details, passwords, or one-time verification codes to support.

## Cancellation

Review the cancellation terms shown in the billing interface before confirming. Access may continue until the end of the paid billing period, depending on the plan. Export important content before a subscription expires.

## Getting billing help

Create a support ticket and include your account email, transaction reference, payment date, and a description of the issue. This information allows the support team to investigate without requesting sensitive payment credentials.`,
    },
    {
        title: "Troubleshooting Common Publishing Issues",
        slug: "troubleshooting-common-publishing-issues",
        categorySlug: "domains-publishing",
        excerpt: "Resolve common problems involving stale content, unavailable websites, domains, forms, and mobile layouts.",
        tags: ["troubleshooting", "publish", "cache", "domain", "forms"],
        sortOrder: 50,
        seo: {
            title: "Troubleshoot Webmintra Publishing Issues",
            description: "Fix common Webmintra website publishing, cache, domain, form, and responsive layout problems.",
        },
        content: `# Troubleshooting Common Publishing Issues

Use this guide when a published website does not look or behave as expected.

## The latest changes are not visible

Confirm that you saved the page and selected **Publish** after the final edit. Refresh the live page with a full reload or open it in a private browser window to bypass cached files.

If only one page is outdated, open that page in the builder, save a small change, publish again, and check the live URL.

## The website is unavailable

Check the website status in **Websites**. If you use a custom domain, confirm that its status is active in **Domains**. A newly changed domain may still be waiting for DNS propagation or SSL certificate provisioning.

Test the Webmintra-provided address. If that address works but the custom domain does not, the issue is usually related to DNS configuration.

## Images do not load

Open **Media** and verify that the image still exists. Replace broken external image links with files uploaded to the workspace. Use supported image formats and optimize unusually large files before uploading.

## Forms do not submit

Confirm that every required field has a value and that the browser is not blocking the request. Submit the form from the live website, then check **Forms** for a new submission.

If the form reports an error, record the exact message, the page URL, and the approximate submission time before contacting support.

## The mobile layout is incorrect

Return to the builder and inspect the mobile preview. Shorten oversized headings, check image dimensions, and verify that sections are ordered correctly. Publish again after making responsive changes.

## Links open the wrong destination

Inspect each affected button or navigation item in the builder. Internal links should target an existing page, while external links should include the complete secure URL beginning with **https://**.

## Before contacting support

Collect the following details:

- Website name and live URL
- Page where the issue occurs
- Exact error message
- Browser and device used
- Approximate time the issue occurred
- Screenshot showing the problem

Do not include passwords, payment card information, session cookies, or one-time verification codes in a support ticket.`,
    },
];

async function seedKnowledgeBase() {
    if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI.");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const admin = await User.findOne({ role: "admin", isEmailVerified: true }).sort({ createdAt: 1 });
    if (!admin) {
        throw new Error("A verified admin user is required to seed Knowledge Base content.");
    }

    const categoryIds = new Map();
    for (const category of categories) {
        const savedCategory = await KBCategory.findOneAndUpdate(
            { slug: category.slug },
            { $set: { ...category, isActive: true, createdBy: admin._id } },
            { upsert: true, new: true, runValidators: true },
        );
        categoryIds.set(category.slug, savedCategory._id);
        console.log(`Upserted category: ${savedCategory.name}`);
    }

    const publishedAt = new Date();
    for (const article of articles) {
        const { categorySlug, ...articleFields } = article;
        const savedArticle = await KBArticle.findOneAndUpdate(
            { slug: article.slug },
            {
                $set: {
                    ...articleFields,
                    category: categoryIds.get(categorySlug),
                    author: admin._id,
                    status: "published",
                    publishedAt,
                    updatedBy: admin._id,
                },
                $setOnInsert: { viewCount: 0, helpfulCount: 0, notHelpfulCount: 0 },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
        console.log(`Upserted article: ${savedArticle.title}`);
    }

    const seededArticles = await KBArticle.find({ slug: { $in: articles.map(({ slug }) => slug) } })
        .populate("category", "name slug")
        .select("title slug status category publishedAt")
        .sort({ sortOrder: 1 })
        .lean();

    console.log(`Knowledge Base seed complete. Verified ${seededArticles.length} articles.`);
    for (const article of seededArticles) {
        console.log(`- ${article.title} [${article.status}] (${article.category?.name ?? "Uncategorized"})`);
    }
}

try {
    await seedKnowledgeBase();
    await mongoose.disconnect();
    process.exit(0);
} catch (error) {
    console.error("Knowledge Base seeding failed:", error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
}
