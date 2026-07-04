"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  width: number;
  label: string;
  children: React.ReactNode;
};

export function CollapsiblePanel({
  side,
  open,
  onToggle,
  width,
  label,
  children,
}: Props) {
  const isLeft = side === "left";

  return (
    <div className={cn("relative hidden h-full shrink-0 lg:flex", isLeft ? "flex-row" : "flex-row-reverse")}>
      <motion.div
        initial={false}
        animate={{ width: open ? width : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="h-full overflow-hidden"
      >
        <div style={{ width }} className="h-full">
          {children}
        </div>
      </motion.div>

      <button
        type="button"
        onClick={onToggle}
        title={open ? `${label} 닫기` : `${label} 열기`}
        className={cn(
          "glass-panel z-10 flex h-full w-8 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-cyber-border text-slate-500 transition-colors hover:border-cyber-cyan/50 hover:text-cyber-cyan",
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
