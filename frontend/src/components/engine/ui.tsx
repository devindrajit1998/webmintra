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
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="font-display text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
        {children}
      </h3>
      {hint ? <span className="truncate text-[11px] text-muted-foreground/70">{hint}</span> : null}
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
    "w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25 placeholder:text-muted-foreground/60";
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
          {label}
        </span>
      ) : null}
      {multiline ? (
        <textarea
          rows={4}
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
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background/50 p-2">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
        aria-label={label}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent font-mono text-xs text-foreground outline-none"
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
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary h-1.5 w-full cursor-pointer appearance-none rounded-full bg-elevated"
      />
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
      className="flex w-full items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-left text-xs font-semibold text-foreground transition hover:border-primary/40"
    >
      {label}
      <span
        className={cn(
          "relative h-4.5 w-8 shrink-0 rounded-full transition",
          checked ? "bg-primary" : "bg-elevated border border-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-all",
            checked ? "left-4" : "left-0.5",
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
