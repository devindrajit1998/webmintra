import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Eye,
  FileQuestion,
  FolderOpen,
  Loader2,
  Search,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import {
  getKnowledgeBaseArticle,
  getKnowledgeBaseArticles,
  getKnowledgeBaseCategories,
  sendKnowledgeBaseFeedback,
  type KnowledgeBaseArticle,
} from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/kb")({
  component: KnowledgeBasePage,
  head: () => ({ meta: [{ title: "Knowledge Base | WebMintra" }] }),
});

function KnowledgeBasePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["kb-categories"],
    queryFn: getKnowledgeBaseCategories,
  });
  const articlesQuery = useQuery({
    queryKey: ["kb-articles", search, category],
    queryFn: () => getKnowledgeBaseArticles({ limit: 100, search, category }),
  });
  const articleQuery = useQuery({
    queryKey: ["kb-article", selectedId],
    queryFn: () => getKnowledgeBaseArticle(selectedId!),
    enabled: !!selectedId,
  });
  const feedbackMutation = useMutation({
    mutationFn: (rating: "helpful" | "not_helpful") =>
      sendKnowledgeBaseFeedback(selectedId!, rating),
    onSuccess: () => {
      setFeedbackSent(true);
      toast.success("Thank you for your feedback");
    },
    onError: (error) => toast.error(error.message),
  });

  const categories = categoriesQuery.data?.categories ?? [];
  const articles = articlesQuery.data?.articles;
  const grouped = useMemo(() => {
    return (articles ?? []).reduce<Record<string, KnowledgeBaseArticle[]>>((result, article) => {
      const key = article.category?.name || "General";
      (result[key] ||= []).push(article);
      return result;
    }, {});
  }, [articles]);

  if (selectedId) {
    return (
      <ArticleReader
        article={articleQuery.data?.article}
        loading={articleQuery.isLoading}
        error={articleQuery.isError}
        feedbackSent={feedbackSent}
        feedbackPending={feedbackMutation.isPending}
        onBack={() => {
          setSelectedId(null);
          setFeedbackSent(false);
        }}
        onRetry={() => articleQuery.refetch()}
        onFeedback={(rating) => feedbackMutation.mutate(rating)}
      />
    );
  }

  return (
    <div className="max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white px-5 py-6 shadow-xs sm:px-7">
        <div className="absolute inset-x-0 top-0 flex h-1" aria-hidden="true">
          <span className="flex-1 bg-[#ea580c]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#059669]" />
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#fff7ed] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-[#ecfdf5] blur-2xl" />
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c2410c]">
            <BookOpen className="h-3.5 w-3.5" /> Help Center & Guides
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
            Knowledge Base
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Find step-by-step guides, documentation, and answers for managing your WebMintra
            workspace.
          </p>
        </div>
      </section>

      {/* Search Container */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 sm:p-6 shadow-xs">
        <label className="relative mx-auto block">
          <span className="sr-only">Search knowledge base</span>
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guides, billing, custom domains, publishing, forms..."
            className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-12 pr-4 text-xs font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669] focus:bg-white transition"
          />
        </label>
      </section>

      {categories.length > 0 && (
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Knowledge base categories">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-bold transition cursor-pointer ${
              !category
                ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                : "border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]"
            }`}
          >
            All topics
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs font-bold transition cursor-pointer ${
                category === item.id
                  ? "border-[#059669] bg-[#059669] text-white shadow-xs"
                  : "border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]"
              }`}
            >
              {item.name}
            </button>
          ))}
        </nav>
      )}

      {articlesQuery.isLoading || categoriesQuery.isLoading ? (
        <State
          icon={<Loader2 className="h-8 w-8 animate-spin text-[#059669]" />}
          title="Loading documentation..."
        />
      ) : articlesQuery.isError ? (
        <State
          icon={<AlertCircle className="h-8 w-8 text-rose-500" />}
          title="Documentation could not be loaded"
          description="Check your connection and try again."
          action={
            <button
              onClick={() => articlesQuery.refetch()}
              className="rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer"
            >
              Try again
            </button>
          }
        />
      ) : !articles?.length ? (
        <State
          icon={<FileQuestion className="h-10 w-10 text-[#cbd5e1]" />}
          title="No articles found"
          description={
            search || category
              ? "Try another search or select all topics."
              : "Published help articles will appear here."
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([name, items]) => (
            <section key={name}>
              <div className="mb-3 flex items-center gap-2 px-1">
                <FolderOpen className="h-4 w-4 text-[#059669]" />
                <h2 className="text-sm font-extrabold text-[#0f172a]">{name}</h2>
                <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b]">
                  {items.length}
                </span>
              </div>
              <div className="divide-y divide-[#f1f5f9] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
                {items.map((article) => (
                  <button
                    key={article.id || (article as any)._id}
                    type="button"
                    onClick={() => setSelectedId(article.id || (article as any)._id)}
                    className="group flex w-full items-center gap-4 p-5 text-left transition hover:bg-[#f8fafc] cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[#059669] group-hover:border-[#a7f3d0] group-hover:bg-[#ecfdf5] transition">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-[#0f172a] group-hover:text-[#059669] transition">
                        {article.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[#64748b]">
                        {article.excerpt ||
                          (article as any).summary ||
                          (article.content
                            ? article.content.slice(0, 140)
                            : "Open this article to read the full guide.")}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-[#94a3b8]">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />{" "}
                          {article.viewCount ?? (article as any).views ?? 0} views
                        </span>
                        {article.updatedAt && (
                          <span>Updated {format(new Date(article.updatedAt), "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#cbd5e1] group-hover:text-[#059669] transition" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleReader({
  article,
  loading,
  error,
  feedbackSent,
  feedbackPending,
  onBack,
  onRetry,
  onFeedback,
}: {
  article: KnowledgeBaseArticle | undefined;
  loading: boolean;
  error: boolean;
  feedbackSent: boolean;
  feedbackPending: boolean;
  onBack: () => void;
  onRetry: () => void;
  onFeedback: (rating: "helpful" | "not_helpful") => void;
}) {
  return (
    <div className="max-w-[1600px] space-y-6 pb-12">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-[#64748b] hover:text-[#059669] transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Knowledge Base
      </button>
      {loading ? (
        <State
          icon={<Loader2 className="h-8 w-8 animate-spin text-[#059669]" />}
          title="Loading article..."
        />
      ) : error || !article ? (
        <State
          icon={<AlertCircle className="h-8 w-8 text-rose-500" />}
          title="Article could not be loaded"
          action={
            <button
              onClick={onRetry}
              className="rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer"
            >
              Try again
            </button>
          }
        />
      ) : (
        <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
          <header className="border-b border-[#f1f5f9] p-6 sm:p-8 bg-[#f8fafc]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#059669]">
              <span className="rounded-full bg-[#ecfdf5] border border-[#a7f3d0] px-3 py-0.5 text-[10px] uppercase tracking-wide">
                {article.category?.name || "General"}
              </span>
              {article.isFaq && (
                <span className="rounded-full bg-[#f1f5f9] border border-[#e2e8f0] px-2.5 py-0.5 text-[10px] text-[#64748b]">
                  FAQ
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-2xl font-extrabold text-[#0f172a] sm:text-3xl">
              {article.title}
            </h1>
            {(article.excerpt || (article as any).summary) && (
              <p className="mt-3 text-xs leading-relaxed text-[#64748b]">
                {article.excerpt || (article as any).summary}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-semibold text-[#94a3b8]">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {article.viewCount ?? (article as any).views ?? 0}{" "}
                views
              </span>
              {article.updatedAt && (
                <span>Updated {format(new Date(article.updatedAt), "MMMM d, yyyy")}</span>
              )}
            </div>
          </header>
          <div className="p-6 sm:p-8">
            <MarkdownContent content={article.content || ""} />
          </div>
          <footer className="border-t border-[#f1f5f9] bg-[#f8fafc] p-6 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold text-[#0f172a]">Was this guide helpful?</p>
                <p className="mt-0.5 text-xs text-[#64748b]">
                  Your feedback helps us improve our documentation for all businesses.
                </p>
              </div>
              {feedbackSent ? (
                <p className="text-xs font-bold text-[#059669]">✓ Thank you for your feedback!</p>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={feedbackPending}
                    onClick={() => onFeedback("helpful")}
                    title="Helpful"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] shadow-2xs hover:border-[#a7f3d0] hover:text-[#059669] disabled:opacity-50 cursor-pointer transition"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={feedbackPending}
                    onClick={() => onFeedback("not_helpful")}
                    title="Not helpful"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] shadow-2xs hover:border-rose-300 hover:text-rose-600 disabled:opacity-50 cursor-pointer transition"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </footer>
        </article>
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length) {
      nodes.push(
        <ul
          key={`list-${nodes.length}`}
          className="my-4 list-disc space-y-2 pl-6 text-xs leading-relaxed text-[#334155]"
        >
          {list.map((item, index) => (
            <li key={index}>{inlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((line, index) => {
    if (/^[-*] /.test(line)) {
      list.push(line.slice(2));
      return;
    }
    flushList();
    if (line.startsWith("### "))
      nodes.push(
        <h3 key={index} className="mb-2 mt-7 text-base font-semibold text-white">
          {line.slice(4)}
        </h3>,
      );
    else if (line.startsWith("## "))
      nodes.push(
        <h2 key={index} className="mb-2 mt-8 text-xl font-semibold text-white">
          {line.slice(3)}
        </h2>,
      );
    else if (line.startsWith("# "))
      nodes.push(
        <h2 key={index} className="mb-3 mt-8 text-xl font-semibold text-white">
          {line.slice(2)}
        </h2>,
      );
    else if (line.startsWith("> "))
      nodes.push(
        <blockquote
          key={index}
          className="my-4 border-l-2 border-cyan-500 bg-cyan-500/5 px-4 py-3 text-sm leading-6 text-slate-300"
        >
          {inlineMarkdown(line.slice(2))}
        </blockquote>,
      );
    else if (line.trim())
      nodes.push(
        <p key={index} className="my-3 text-sm leading-7 text-slate-300">
          {inlineMarkdown(line)}
        </p>,
      );
  });
  flushList();
  return (
    <div className="[&>*:first-child]:mt-0">
      {nodes.length ? (
        nodes
      ) : (
        <p className="text-sm text-slate-500">This article has no content yet.</p>
      )}
    </div>
  );
}

function inlineMarkdown(value: string) {
  const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code
        key={index}
        className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-cyan-300"
      >
        {part.slice(1, -1)}
      </code>
    ) : part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

function State({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white p-8 text-center shadow-xs">
      {icon}
      <h2 className="mt-3.5 text-base font-extrabold text-[#0f172a]">{title}</h2>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#64748b]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
