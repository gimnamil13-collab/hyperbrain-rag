"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const panelWidth = isDesktop ? (open ? width : 0) : "100%";

  return (
    <div
      className={cn(
        "relative min-h-0 h-full shrink-0",
        isLeft ? "lg:flex-row" : "lg:flex-row-reverse",
        mobileVisible ? "flex flex-1 flex-col" : "hidden",
        "lg:flex",
      )}
    >
      <motion.div
        initial={false}
        animate={{ width: panelWidth }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="h-full min-h-0 overflow-hidden"
      >
        <div className={cn("h-full", isDesktop && "shrink-0")} style={isDesktop ? { width } : undefined}>
          {children}
        </div>
      </motion.div>

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
