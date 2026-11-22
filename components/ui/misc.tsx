"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-navy-900/8 bg-white p-5 shadow-[0_1px_0_rgba(11,16,38,0.04)] sm:p-6", className)} {...props} />;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full bg-navy-900/6 px-2.5 py-1 text-xs font-semibold text-ink", className)}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-6 animate-spin rounded-full border-[3px] border-navy-900/15 border-t-sunset-500", className)}
      aria-label="Loading"
      role="status"
    />
  );
}

export function PageLoader({ label = "Loading your journeys…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl border-2 border-dashed border-navy-900/12 bg-white/50 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-sunset-500/10 text-sunset-600">{icon}</div>}
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream-50 p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl",
              className,
            )}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h2 className="font-display text-xl font-bold">{title}</h2>}
              <button onClick={onClose} className="-m-1 rounded-full p-1.5 text-muted hover:bg-navy-900/5" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StatTile({
  label,
  value,
  accent = "sunset",
  sub,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "sunset" | "electric" | "jungle" | "navy";
  sub?: string;
}) {
  const ring = {
    sunset: "from-sunset-500/15 to-sunset-500/0 text-sunset-600",
    electric: "from-electric-500/15 to-electric-500/0 text-electric-600",
    jungle: "from-jungle-500/15 to-jungle-500/0 text-jungle-600",
    navy: "from-navy-900/10 to-navy-900/0 text-navy-900",
  }[accent];
  return (
    <div className={cn("rounded-3xl bg-gradient-to-br p-4 sm:p-5", ring)}>
      <div className="font-display text-3xl font-extrabold tabular-nums sm:text-4xl">{value}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
