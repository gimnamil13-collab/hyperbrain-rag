"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Cpu,
  FileText,
  HardDrive,
  Search,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { DocumentItem } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  documents: DocumentItem[];
  loading: boolean;
  onIngestSamples: () => void;
  onUpload: (files: FileList) => void;
  onToggleMount: (name: string, mounted: boolean) => void;
  onDelete: (name: string) => void;
  onClearAll: () => void;
  embedded?: boolean;
  className?: string;
};

function NodeSkeleton() {
  return (
    <div className="space-y-2 px-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-cyber-border bg-black/20 px-3 py-3"
        >
          <div className="h-3 w-3/4 rounded bg-slate-800" />
          <div className="mt-2 h-2 w-1/2 rounded bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}

export function DocumentSidebar({
  documents,
  loading,
  onIngestSamples,
  onUpload,
  onToggleMount,
  onDelete,
  onClearAll,
  embedded = false,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()),
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files);
    },
    [onUpload],
  );

  const Wrapper = embedded ? "div" : motion.aside;
  const wrapperProps = embedded
    ? {}
    : {
        initial: { x: -24, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        transition: { type: "spring" as const, stiffness: 260, damping: 28 },
      };

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        embedded
          ? "flex flex-col overflow-hidden"
          : "glass-panel flex h-full shrink-0 flex-col rounded-2xl",
        className,
      )}
    >
      <div className={cn("border-b border-cyber-border p-3", embedded && "px-4")}>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-cyber-cyan" />
          <div>
            <p className="font-display text-[10px] tracking-widest text-cyber-cyan">
              KNOWLEDGE NODES
            </p>
            <p className="text-xs font-medium text-slate-200">지식 노드</p>
          </div>
        </div>
      </div>

      <div className={cn("space-y-2 p-3", embedded && "px-4")}>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onIngestSamples}
          disabled={loading}
          className="neon-button flex w-full items-center justify-center gap-2 py-2 text-xs"
        >
          <Zap className="h-3.5 w-3.5" />
          {loading ? "처리 중..." : "샘플 노드 로드"}
        </motion.button>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !loading && fileRef.current?.click()}
          className={cn(
            "cursor-pointer rounded-lg border border-dashed p-3 text-center transition-colors duration-200",
            loading && "pointer-events-none opacity-50",
            dragOver
              ? "border-cyber-cyan bg-cyan-950/30 shadow-neon-sm"
              : "border-cyber-border hover:border-cyan-700/50",
          )}
        >
          <Upload className="mx-auto mb-1 h-4 w-4 text-cyber-purple" />
          <p className="text-[11px] text-slate-300">PDF / MD / TXT</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.md,.txt"
            className="hidden"
            onChange={(e) => e.target.files && onUpload(e.target.files)}
          />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="노드 검색..."
            className="cyber-input w-full py-2 pl-10 pr-3 text-xs"
          />
        </div>
      </div>

      <div className={cn("flex items-center justify-between px-3 pb-1", embedded && "px-4")}>
        <span className="font-display text-[10px] tracking-wider text-slate-500">
          MOUNTED · {documents.filter((d) => d.mounted).length}/{documents.length}
        </span>
        <div className="flex items-center gap-1.5">
          {documents.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              disabled={loading}
              title="전체 노드 PURGE"
              className="rounded border border-red-900/50 p-1 text-red-400 hover:border-red-500 disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <HardDrive className="h-3 w-3 text-slate-600" />
        </div>
      </div>

      <div className={cn("scrollbar-cyber flex-1 space-y-1 overflow-y-auto px-3 pb-3", embedded && "px-4")}>
        {loading ? (
          <NodeSkeleton />
        ) : filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-slate-500">
            등록된 노드 없음
          </p>
        ) : (
          filtered.map((doc, i) => (
            <motion.div
              key={doc.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "rounded-lg border px-2.5 py-2 transition-colors duration-200",
                doc.mounted
                  ? "border-cyan-900/50 bg-cyan-950/20 hover:border-cyber-cyan/40"
                  : "border-slate-800 bg-black/20",
              )}
            >
              <div className="flex items-start gap-2">
                <FileText
                  className={cn(
                    "mt-0.5 h-3 w-3 shrink-0",
                    doc.mounted ? "text-cyber-cyan" : "text-slate-600",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p
                      className={cn(
                        "truncate text-[11px] font-medium",
                        doc.mounted ? "text-slate-200" : "text-slate-500",
                      )}
                    >
                      {doc.name}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 font-display text-[8px]",
                        doc.mounted
                          ? "bg-cyan-950/50 text-cyan-400"
                          : "bg-slate-900/60 text-slate-500",
                      )}
                    >
                      {doc.mounted ? "ON" : "OFF"}
                    </span>
                  </div>
                  {doc.is_sample && (
                    <span className="font-display text-[9px] text-cyber-purple/80">SAMPLE</span>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex gap-1">
                <button
                  type="button"
                  onClick={() => onToggleMount(doc.name, !doc.mounted)}
                  className="rounded border border-cyber-border px-1.5 py-0.5 text-[9px] text-cyan-300 hover:border-cyber-cyan"
                >
                  {doc.mounted ? "UNMOUNT" : "MOUNT"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(doc.name)}
                  className="rounded border border-red-900/50 px-1.5 py-0.5 text-[9px] text-red-400 hover:border-red-500"
                >
                  PURGE
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {embedded && (
        <div className="border-t border-cyber-border px-4 py-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <Cpu className="h-3 w-3 text-cyber-cyan" />
            <span className="font-display">HYPERBRAIN v1.0</span>
          </div>
        </div>
      )}
    </Wrapper>
  );
}
