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
    <div className="mx-auto space-y-7">
      <header>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-cyan-400">
          <BookOpen className="h-4 w-4" /> Help center
        </div>
        <h1 className="font-display text-3xl font-bold text-white">Knowledge base</h1>
        <p className="mt-2 text-sm text-slate-400">
          Find answers and practical guides for managing your workspace.
        </p>
      </header>

      <section className="border-y border-slate-800 bg-[#0b1826] p-5 sm:rounded-lg sm:border sm:p-7">
        <label className="relative mx-auto block">
          <span className="sr-only">Search knowledge base</span>
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guides, billing, domains, publishing..."
            className="h-12 w-full rounded-lg border border-slate-700 bg-slate-950/70 pl-12 pr-4 text-sm text-white outline-none transition focus:border-cyan-500"
          />
        </label>
      </section>

      {categories.length > 0 && (
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Knowledge base categories">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs font-medium ${!category ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-slate-800 text-slate-400 hover:border-slate-700"}`}
          >
            All topics
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs font-medium ${category === item.id ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-slate-800 text-slate-400 hover:border-slate-700"}`}
            >
              {item.name}
            </button>
          ))}
        </nav>
      )}

      {articlesQuery.isLoading || categoriesQuery.isLoading ? (
        <State
          icon={<Loader2 className="h-8 w-8 animate-spin text-cyan-400" />}
          title="Loading documentation"
        />
      ) : articlesQuery.isError ? (
        <State
          icon={<AlertCircle className="h-8 w-8 text-rose-400" />}
          title="Documentation could not be loaded"
          description="Check your connection and try again."
          action={
            <button
              onClick={() => articlesQuery.refetch()}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950"
            >
              Try again
            </button>
          }
        />
      ) : !articles?.length ? (
        <State
          icon={<FileQuestion className="h-9 w-9 text-slate-600" />}
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
              <div className="mb-3 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-200">{name}</h2>
                <span className="text-xs text-slate-600">{items.length}</span>
              </div>
              <div className="divide-y divide-slate-800 overflow-hidden border-y border-slate-800 bg-[#0b1826] sm:rounded-lg sm:border">
                {items.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => setSelectedId(article.id)}
                    className="group flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-900/50 sm:p-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-400 group-hover:text-cyan-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                        {article.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {article.excerpt || "Open this article to read the full guide."}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-600">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {article.viewCount}
                        </span>
                        {article.isFaq && <span>FAQ</span>}
                        {article.updatedAt && (
                          <span>Updated {format(new Date(article.updatedAt), "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-400" />
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
    <div className="mx-auto ">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to knowledge base
      </button>
      {loading ? (
        <State
          icon={<Loader2 className="h-8 w-8 animate-spin text-cyan-400" />}
          title="Loading article"
        />
      ) : error || !article ? (
        <State
          icon={<AlertCircle className="h-8 w-8 text-rose-400" />}
          title="Article could not be loaded"
          action={
            <button
              onClick={onRetry}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950"
            >
              Try again
            </button>
          }
        />
      ) : (
        <article className="border-y border-slate-800 bg-[#0b1826] sm:rounded-lg sm:border">
          <header className="border-b border-slate-800 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-400">
              <span>{article.category?.name || "General"}</span>
              {article.isFaq && (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">FAQ</span>
              )}
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-3 text-sm leading-6 text-slate-400">{article.excerpt}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {article.viewCount} views
              </span>
              <span>Updated {format(new Date(article.updatedAt), "MMMM d, yyyy")}</span>
            </div>
          </header>
          <div className="px-5 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
            <MarkdownContent content={article.content || ""} />
          </div>
          <footer className="border-t border-slate-800 p-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">Was this article helpful?</p>
                <p className="mt-1 text-xs text-slate-500">
                  Your feedback helps us improve this documentation.
                </p>
              </div>
              {feedbackSent ? (
                <p className="text-sm font-medium text-emerald-400">Feedback received</p>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={feedbackPending}
                    onClick={() => onFeedback("helpful")}
                    title="Helpful"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-50"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={feedbackPending}
                    onClick={() => onFeedback("not_helpful")}
                    title="Not helpful"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50"
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
          className="my-4 list-disc space-y-2 pl-6 text-sm leading-7 text-slate-300"
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
    <div className="flex min-h-72 flex-col items-center justify-center border-y border-slate-800 bg-[#0b1826] p-8 text-center sm:rounded-lg sm:border">
      {icon}
      <h2 className="mt-4 text-base font-semibold text-slate-200">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
