import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useState } from "react";
import { LandingPage } from "@/components/LandingPage";
import type { TemplateAnalysis } from "@/lib/template-engine/types";

const ImportWizard = lazy(() =>
  import("@/components/engine/ImportWizard").then((mod) => ({ default: mod.ImportWizard })),
);
const Editor = lazy(() =>
  import("@/components/engine/Editor").then((mod) => ({ default: mod.Editor })),
);
import { getSessionUser, routeForRole } from "@/lib/auth-api";
import { getPublicSettings } from "@/lib/public-api";

const DEFAULT_TITLE = "WebMintra - Build Websites with Ease";
const DEFAULT_DESCRIPTION = "WebMintra helps businesses build beautiful websites.";

function landingHead(settings: Record<string, unknown> = {}) {
  const title = String(settings["seo.defaultTitle"] || DEFAULT_TITLE);
  const description = String(settings["seo.defaultDescription"] || DEFAULT_DESCRIPTION);
  const siteName = String(settings["site.name"] || "WebMintra");
  const keywords = String(settings["seo.keywords"] || "");
  const canonicalUrl = String(settings["seo.canonicalUrl"] || "/");
  const socialImageUrl = String(settings["seo.socialImageUrl"] || settings["brand.logoUrl"] || "");
  const twitterHandle = String(settings["seo.twitterHandle"] || "");
  const locale = String(settings["seo.locale"] || "en_IN");
  const organizationName = String(settings["seo.organizationName"] || siteName);
  const organizationLogoUrl = String(
    settings["seo.organizationLogoUrl"] || settings["brand.logoUrl"] || "",
  );
  const allowIndexing =
    settings["seo.allowIndexing"] !== false && settings["seo.allowIndexing"] !== "false";
  const robots = allowIndexing ? "index, follow, max-image-preview:large" : "noindex, nofollow";

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organizationName,
    url: canonicalUrl,
    ...(organizationLogoUrl ? { logo: organizationLogoUrl } : {}),
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: canonicalUrl,
    description,
    publisher: { "@type": "Organization", name: organizationName },
  };

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: robots },
      { name: "googlebot", content: robots },
      ...(keywords ? [{ name: "keywords", content: keywords }] : []),
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl },
      { property: "og:site_name", content: siteName },
      { property: "og:locale", content: locale },
      ...(socialImageUrl
        ? [
            { property: "og:image", content: socialImageUrl },
            { property: "og:image:alt", content: `${siteName} landing page` },
          ]
        : []),
      { name: "twitter:card", content: socialImageUrl ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(twitterHandle ? [{ name: "twitter:site", content: twitterHandle }] : []),
      ...(socialImageUrl ? [{ name: "twitter:image", content: socialImageUrl }] : []),
    ],
    links: [{ rel: "canonical", href: canonicalUrl }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(organization) },
      { type: "application/ld+json", children: JSON.stringify(website) },
    ],
  };
}

export const Route = createFileRoute("/")({
  component: Index,
  beforeLoad: () => {
    const searchParams =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const isPreview = searchParams?.has("preview_site");
    if (isPreview) return;

    const user = getSessionUser();
    if (user) {
      throw redirect({ to: routeForRole(user.role), replace: true });
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["publicSettings"],
      queryFn: () => getPublicSettings().catch(() => ({})),
      staleTime: 1000 * 60,
    }),
  head: ({ loaderData }) => landingHead(loaderData),
});

function Index() {
  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);
  const [started, setStarted] = useState(false);

  const searchParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const previewSite = searchParams?.get("preview_site");

  if (previewSite) {
    return <PublicSiteViewer subdomain={previewSite} />;
  }

  if (analysis) {
    return (
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#059669] border-t-transparent" />
          </div>
        }
      >
        <Editor analysis={analysis} onExit={() => setAnalysis(null)} />
      </Suspense>
    );
  }

  if (!started) return <LandingPage />;

  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#059669] border-t-transparent" />
          </div>
        }
      >
        <ImportWizard onComplete={setAnalysis} />
      </Suspense>
    </div>
  );
}
