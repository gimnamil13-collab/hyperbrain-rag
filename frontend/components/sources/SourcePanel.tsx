"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Radio, ScanLine } from "lucide-react";
import type { SourceItem } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  sources: SourceItem[];
  activeId: number | null;
  onSelect: (id: number) => void;
  className?: string;
};

export function SourcePanel({ sources, activeId, onSelect, className }: Props) {
  const cardRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (activeId == null) return;
    const el = cardRefs.current.get(activeId);
    el?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [activeId, sources]);

  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.08 }}
      className={cn(
        "glass-panel flex h-full shrink-0 flex-col rounded-2xl",
        className,
      )}
    >
      <div className="border-b border-cyber-border p-4">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-cyber-purple" />
          <div>
            <p className="font-display text-xs tracking-widest text-cyber-purple">
              SOURCE MATRIX
            </p>
            <p className="text-sm font-medium text-slate-200">출처 패널</p>
          </div>
        </div>
      </div>

      <div className="scrollbar-cyber flex-1 space-y-2 overflow-y-auto p-3">
        {sources.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-cyber-border">
              <ScanLine className="h-6 w-6 text-slate-600 animate-pulse-glow" />
            </div>
            <p className="text-xs text-slate-500">
              답변의 각주 <span className="text-cyber-cyan">[1][2]</span>를 클릭하면
              <br />
              원문이 네온 하이라이트와 함께 표시됩니다
            </p>
          </div>
        ) : (
          sources.map((src) => {
            const isActive = activeId === src.id;
            return (
              <button
                key={`${src.id}-${src.source}`}
                ref={(el) => {
                  if (el) cardRefs.current.set(src.id, el);
                  else cardRefs.current.delete(src.id);
                }}
                type="button"
                onClick={() => onSelect(src.id)}
                className={cn(
                  "source-card w-full rounded-xl border p-3.5 text-left transition-colors duration-200",
                  isActive
                    ? "source-card-active border-cyber-cyan bg-cyan-950/50"
                    : "border-cyber-border bg-black/20 hover:border-cyan-800/60",
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="font-display text-sm text-cyber-cyan">[{src.id}]</span>
                  <Radio
                    className={cn(
                      "h-3.5 w-3.5",
                      isActive ? "text-cyber-cyan animate-pulse-glow" : "text-slate-600",
                    )}
                  />
                  {isActive && (
                    <span className="font-display text-[10px] text-cyber-purple">ACTIVE</span>
                  )}
                </div>
                <p className="truncate text-sm font-medium text-slate-200">{src.source}</p>
                {src.page && (
                  <p className="font-display text-xs text-slate-500">PAGE {src.page}</p>
                )}
                <div
                  className={cn(
                    "mt-2 overflow-hidden transition-[max-height] duration-300 ease-out",
                    isActive ? "max-h-72" : "max-h-[4.5rem]",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs leading-relaxed",
                      isActive
                        ? "max-h-72 overflow-y-auto whitespace-pre-wrap text-slate-200 scrollbar-cyber"
                        : "line-clamp-3 text-slate-400",
                    )}
                  >
                    {isActive ? src.content : src.preview}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </motion.aside>
  );
}
