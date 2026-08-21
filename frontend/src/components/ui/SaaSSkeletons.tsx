import React from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";

// ── Base Animated Shimmer Element ─────────────────────────────
export function Shimmer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-slate-200/75 dark:bg-slate-800/80 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

// ── Full Page Premium Brand Loader ────────────────────────────
export function PageLoader({ text = "Loading workspace..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/85 backdrop-blur-md transition-all">
      <div className="relative flex flex-col items-center">
        {/* Glowing aura */}
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#ea580c]/20 via-[#059669]/20 to-[#0284c7]/20 blur-xl animate-pulse" />
        
        {/* Animated Brand Logo Container */}
        <div className="relative flex items-center justify-center p-4">
          <BrandLogo size="lg" />
        </div>

        {/* Dynamic Spinner Ring */}
        <div className="mt-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#ea580c] animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-[#059669] animate-bounce" />
        </div>

        <p className="mt-3 text-xs font-bold tracking-wide text-slate-600 dark:text-slate-400">
          {text}
        </p>
      </div>
    </div>
  );
}

// ── SaaS Stats Row Skeleton (e.g. Total Websites, Active Leads, MRR) ─
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <Shimmer className="h-4 w-24 rounded-md" />
            <Shimmer className="h-9 w-9 rounded-xl" />
          </div>
          <div className="mt-4 space-y-2">
            <Shimmer className="h-8 w-28 rounded-lg" />
            <Shimmer className="h-3 w-36 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SaaS Table Skeleton (e.g. Users, Websites, Orders, Invoices) ────
export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Table Header Skeleton */}
      <div className="border-b border-slate-200/80 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-36 rounded-md" />
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-24 rounded-lg" />
            <Shimmer className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-4 border-b border-slate-200/60 px-6 py-3 bg-slate-50/30 dark:border-slate-800/60 dark:bg-slate-950/20">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="col-span-2 first:col-span-3 last:col-span-1">
            <Shimmer className="h-3.5 w-4/5 rounded-md" />
          </div>
        ))}
      </div>

      {/* Row Items */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-12 items-center gap-4 px-6 py-4"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="col-span-2 first:col-span-3 last:col-span-1 flex items-center gap-3"
              >
                {colIndex === 0 && <Shimmer className="h-8 w-8 shrink-0 rounded-full" />}
                <Shimmer
                  className={cn(
                    "h-4 rounded-md",
                    colIndex === 0 ? "w-3/4" : colIndex === columns - 1 ? "w-6 h-6 rounded-lg ml-auto" : "w-2/3"
                  )}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Card Grid Skeleton (e.g. Website Templates, Custom Domains) ────
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Card Media Preview */}
          <Shimmer className="aspect-video w-full rounded-none" />
          
          {/* Card Body */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-1/2 rounded-md" />
              <Shimmer className="h-4 w-16 rounded-full" />
            </div>
            <Shimmer className="h-3 w-full rounded-md" />
            <Shimmer className="h-3 w-4/5 rounded-md" />
            
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Shimmer className="h-8 w-20 rounded-xl" />
              <Shimmer className="h-8 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Form Skeleton (e.g. Settings, Profile, SEO configuration) ──────
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
      <div className="space-y-2 border-b border-slate-100 pb-4 dark:border-slate-800">
        <Shimmer className="h-6 w-48 rounded-md" />
        <Shimmer className="h-3.5 w-80 rounded-md" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Shimmer className="h-3.5 w-28 rounded-md" />
            <Shimmer className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Shimmer className="h-10 w-24 rounded-xl" />
        <Shimmer className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}
