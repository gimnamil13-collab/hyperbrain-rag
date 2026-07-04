"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Brain, MessageSquare, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobilePanel = "nodes" | "chat" | "sources";

type Props = {
  active: MobilePanel;
  onChange: (panel: MobilePanel) => void;
  sourceCount: number;
};

const tabs: { id: MobilePanel; label: string; icon: typeof Brain }[] = [
  { id: "nodes", label: "노드", icon: Brain },
  { id: "chat", label: "채팅", icon: MessageSquare },
  { id: "sources", label: "출처", icon: ScanLine },
];

export function MobileNav({ active, onChange, sourceCount }: Props) {
  return (
    <nav className="glass-panel flex shrink-0 rounded-xl p-1 lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] transition-colors",
              isActive ? "text-cyan-300" : "text-slate-500",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-tab"
                className="absolute inset-0 rounded-lg border border-cyan-500/40 bg-cyan-950/40 shadow-neon-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1">
              <Icon className="h-4 w-4" />
              {tab.id === "sources" && sourceCount > 0 && (
                <span className="rounded-full bg-purple-600 px-1 text-[8px] text-white">
                  {sourceCount}
                </span>
              )}
            </span>
            <span className="relative font-display tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
