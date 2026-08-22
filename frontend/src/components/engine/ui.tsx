import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Btn({
  children,
  onClick,
  variant = "default",
  size = "md",
  disabled,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "icon";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const variants: Record<string, string> = {
    default: "bg-elevated text-foreground border border-border hover:bg-secondary",
    primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-glow",
    accent: "bg-accent text-accent-foreground hover:brightness-110",
    ghost:
      "text-muted-foreground hover:text-foreground hover:bg-elevated border border-transparent",
    danger:
      "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    icon: "h-8 w-8 justify-center",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "accent" | "danger" | "success" | "warning";
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: "bg-elevated text-muted-foreground border-border",
    primary: "bg-primary/12 text-primary border-primary/30",
    accent: "bg-accent/12 text-accent border-accent/30",
    danger: "bg-destructive/12 text-destructive border-destructive/30",
    success: "bg-success/12 text-success border-success/30",
    warning: "bg-warning/12 text-warning border-warning/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("panel", className)}>{children}</div>;
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string | undefined;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
      <h3 className="font-display text-[11px] font-extrabold tracking-[0.12em] text-foreground uppercase">
        {children}
      </h3>
      {hint ? <span className="truncate rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type = "text",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const base =
    "w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs";
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="block text-[11px] font-bold text-foreground/80">
          {label}
        </span>
      ) : null}
      {multiline ? (
        <textarea
          rows={3}
          className={base}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className={base}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hexVal = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-2.5 shadow-2xs hover:border-border transition">
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border/80 shadow-inner">
        <input
          type="color"
          value={hexVal}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-2 h-12 w-12 cursor-pointer opacity-0"
          aria-label={label}
        />
        <div className="h-full w-full" style={{ backgroundColor: value || "#000000" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-foreground/80">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-full bg-transparent font-mono text-xs text-muted-foreground outline-none uppercase font-semibold focus:text-foreground"
        />
      </div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/60 p-2.5 shadow-2xs">
      <div className="flex items-center justify-between text-[11px] font-bold text-foreground/80">
        <span>{label}</span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative flex items-center py-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #059669 ${percent}%, #e2e8f0 ${percent}%)`,
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-full accent-[#059669] transition-all focus:outline-none"
        />
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-card px-3 py-2.5 text-left text-xs font-bold text-foreground shadow-2xs transition hover:border-[#059669]/50"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-[#059669]" : "bg-slate-300 border border-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200",
            checked ? "left-4.5" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function ConfidenceChip({ level }: { level: "High" | "Medium" | "Low" }) {
  return (
    <Chip tone={level === "High" ? "success" : level === "Medium" ? "warning" : "danger"}>
      {level}
    </Chip>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
      <div className="text-primary mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
        {icon}
      </div>
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
