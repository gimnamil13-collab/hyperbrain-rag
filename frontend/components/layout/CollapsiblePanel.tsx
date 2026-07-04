"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  width: number;
  label: string;
  mobileVisible?: boolean;
  children: React.ReactNode;
};

function desktopWidthClass(width: number, open: boolean): string {
  if (!open) return "lg:w-0";
  if (width === 280) return "lg:w-[280px]";
  if (width === 340) return "lg:w-[340px]";
  return open ? `lg:w-[${width}px]` : "lg:w-0";
}

function innerWidthClass(width: number): string {
  if (width === 280) return "lg:w-[280px]";
  if (width === 340) return "lg:w-[340px]";
  return `lg:w-[${width}px]`;
}

export function CollapsiblePanel({
  side,
  open,
  onToggle,
  width,
  label,
  mobileVisible = false,
  children,
}: Props) {
  const isLeft = side === "left";

  return (
    <div
      className={cn(
        "relative flex min-h-0 h-full shrink-0",
        isLeft ? "flex-row" : "flex-row-reverse",
        mobileVisible ? "flex max-lg:flex-1 flex-col" : "hidden",
        "lg:flex",
      )}
    >
      <div
        className={cn(
          "h-full w-full min-h-0 overflow-hidden",
          "transition-[width] duration-300 ease-out",
          desktopWidthClass(width, open),
        )}
      >
        <div className={cn("h-full w-full shrink-0", innerWidthClass(width))}>{children}</div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        title={open ? `${label} 닫기` : `${label} 열기`}
        className={cn(
          "glass-panel z-10 hidden h-full w-8 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-cyber-border text-slate-500 transition-colors hover:border-cyber-cyan/50 hover:text-cyber-cyan lg:flex",
          !open && "shadow-neon-sm",
        )}
      >
        {isLeft ? (
          open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
        ) : open ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
        <span
          className="font-display text-[8px] tracking-wider"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}
