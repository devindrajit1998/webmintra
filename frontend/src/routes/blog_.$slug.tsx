import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicBlogPost, getPublicSettings } from "@/lib/public-api";
import { getAuthenticatedUser, routeForRole, type SessionUser } from "@/lib/auth-api";
import {
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Tag,
  Key,
  Sparkles,
  Loader2,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/blog_/$slug")({
  loader: async ({ params }) => {
    try {
      const [post, settings] = await Promise.all([
        getPublicBlogPost(params.slug),
        getPublicSettings().catch(() => ({})),
      ]);
      return { post, settings };
    } catch {
      return { post: null, settings: {} };
    }
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post;
    const settings = loaderData?.settings || {};
    const siteName = String(settings["site.name"] || "WebMintra");
    const canonicalBase = String(settings["seo.canonicalUrl"] || "https://webmintra.in").replace(/\/$/, "");
    const pageUrl = `${canonicalBase}/blog/${params.slug}`;

    if (!post) {
      return {
        meta: [{ title: `Article Not Found | ${siteName}` }, { name: "robots", content: "noindex" }],
      };
    }

    const title = `${post.seo?.title || post.title} | ${siteName}`;
    const description = post.seo?.description || post.excerpt || `${post.title} on ${siteName}`;
    const ogImage = post.seo?.ogImage || post.coverImage || settings["seo.socialImageUrl"] || settings["brand.logoUrl"] || "";
    const publishedIso = post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString();

    const jsonLdArticle = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description,
      ...(ogImage ? { image: ogImage } : {}),
      datePublished: publishedIso,
      dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : publishedIso,
      author: {
        "@type": "Person",
        name: post.author?.name || siteName,
      },
      publisher: {
        "@type": "Organization",
        name: siteName,
        ...(settings["brand.logoUrl"] ? { logo: { "@type": "ImageObject", url: settings["brand.logoUrl"] } } : {}),
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
    };

    const jsonLdBreadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: canonicalBase,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${canonicalBase}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: pageUrl,
        },
      ],
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: pageUrl },
        { property: "og:site_name", content: siteName },
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(ogImage ? [{ name: "twitter:image", content: ogImage }] : []),
      ],
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLdArticle),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLdBreadcrumb),
        },
      ],
    };
  },
  component: SingleBlogPostPage,
});

function SingleBlogPostPage() {
  const { slug } = Route.useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useState(() => {
    void getAuthenticatedUser().then(setUser);
  });

  const primaryRoute = user ? routeForRole(user.role) : "/create-account";

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5,
  });

  const { data: post, isLoading } = useQuery({
    queryKey: ["publicBlogPost", slug],
    queryFn: () => getPublicBlogPost(slug),
  });

  if (isLoading) {
    return (
      <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#ea580c]" />
          <p className="text-xs font-semibold text-[#64748b]">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-extrabold text-[#0b192c]">Article Not Found</h1>
        <p className="mt-2 text-sm text-[#64748b] max-w-md">
          This blog post might be in draft mode or the link has changed.
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#047857]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen tiranga-hero-bg indian-jali-pattern text-[#0f172a] font-sans">
      {/* ── GLOBAL HEADER NAVIGATION ─────────────────────────────────── */}
      <PublicHeader />

      {/* ── MAIN ARTICLE CONTAINER (Aligned with Landing max-w-7xl) ──── */}
      <main className="mx-auto max-w-7xl px-5 sm:px-6 py-10 lg:py-14">
        {/* Back Link & Category */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Articles
          </Link>
          {post.category && (
            <span className="rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#047857]">
              {post.category.name}
            </span>
          )}
        </div>

        {/* Article Card Wrapper */}
        <div className="rounded-3xl border border-[#e2e8f0] bg-white p-6 sm:p-10 lg:p-14 shadow-xs">
          {/* Title */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0b192c] leading-tight">
            {post.title}
          </h1>

          {/* Meta Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] pb-6">
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748b]">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#ea580c]" />
                <span className="font-bold text-[#0b192c]">{post.author?.name || "WebMintra Admin"}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#059669]" />
                <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#94a3b8]" />
                <span>{post.readTimeMinutes || 3} min read</span>
              </div>
            </div>
          </div>

          {/* Excerpt Lead */}
          {post.excerpt && (
            <div className="my-6 rounded-2xl border border-[#fed7aa] bg-[#fff7ed]/60 p-5 text-sm font-medium text-[#9a3412] leading-relaxed">
              {post.excerpt}
            </div>
          )}

          {/* Cover Image */}
          {post.coverImage && (
            <div className="my-8 overflow-hidden rounded-2xl border border-[#e2e8f0] shadow-sm bg-slate-50">
              <img
                src={post.coverImage}
                alt={post.title}
                loading="lazy"
                decoding="async"
                className="w-full max-h-[480px] object-cover"
              />
            </div>
          )}

          {/* Article Body Content (Rich CKEditor HTML) */}
          <article
            className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-[#334155] font-sans"
            dangerouslySetInnerHTML={{ __html: post.content || "" }}
          />

          {/* SEO Keywords & Tags Section */}
          {(post.seo?.keywords?.length > 0 || post.tags?.length > 0) && (
            <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b192c] mb-2.5 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#ea580c]" /> Related Topics &amp; Search Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.seo?.keywords?.map((k: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-1 text-[11px] font-bold text-[#c2410c]"
                  >
                    <Key className="h-3 w-3" /> {k}
                  </span>
                ))}
                {post.tags?.map((t: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569]"
                  >
                    <Tag className="h-3 w-3" /> #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bottom CTA Card */}
          <div className="mt-6 rounded-3xl border border-[#a7f3d0] bg-gradient-to-br from-[#ecfdf5] to-[#f0fdf4] p-6 sm:p-8 text-center shadow-xs">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#064e3b]">
              Ready to Launch Your Business Website?
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#047857] max-w-lg mx-auto">
              Choose a professional template and launch your mobile-responsive website in minutes with zero coding.
            </p>
            <Link
              to={primaryRoute}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#059669] px-6 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#047857] transition active:scale-[0.98]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
