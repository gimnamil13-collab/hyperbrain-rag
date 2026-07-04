"use client";

import { MessageSquare, PenLine, Trash2 } from "lucide-react";
import type { Conversation } from "@/lib/api";
import { DocumentSidebar } from "@/components/sidebar/DocumentSidebar";
import type { DocumentItem } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  conversations: Conversation[];
  activeConvId: string | null;
  documents: DocumentItem[];
  loading: boolean;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onIngestSamples: () => void;
  onUpload: (files: FileList) => void;
  onToggleMount: (name: string, mounted: boolean) => void;
  onDelete: (name: string) => void;
  onClearAll: () => void;
  className?: string;
};

export function LeftSidebar({
  conversations,
  activeConvId,
  documents,
  loading,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onIngestSamples,
  onUpload,
  onToggleMount,
  onDelete,
  onClearAll,
  className,
}: Props) {
  return (
    <aside
      className={cn(
        "glass-panel flex h-full flex-col overflow-hidden rounded-2xl",
        className,
      )}
    >
      <div className="border-b border-cyber-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-cyber-purple" />
          <div>
            <p className="font-display text-[10px] tracking-widest text-cyber-purple">SESSIONS</p>
            <p className="text-xs font-medium text-slate-300">대화 세션</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 border-b border-cyber-border p-3">
        <button
          type="button"
          onClick={onNewSession}
          className="flex w-full items-center gap-2 rounded-lg border border-cyber-purple/40 bg-purple-950/20 px-3 py-2 text-xs text-purple-100 transition-colors hover:border-cyber-purple hover:shadow-neon-sm"
        >
          <PenLine className="h-3.5 w-3.5 shrink-0" />
          새 세션
        </button>

        <div className="scrollbar-cyber max-h-36 space-y-0.5 overflow-y-auto">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConvId;
            return (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg border px-2 py-1.5 transition-colors",
                  isActive
                    ? "border-cyber-cyan/50 bg-cyan-950/30"
                    : "border-transparent hover:border-cyber-border hover:bg-black/20",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectSession(conv.id)}
                  className="min-w-0 flex-1 truncate text-left text-xs text-slate-300"
                >
                  {conv.title || "NEW SESSION"}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSession(conv.id)}
                  disabled={conversations.length <= 1}
                  title="세션 삭제"
                  className="shrink-0 rounded p-1 text-red-400 opacity-0 transition-opacity hover:bg-red-950/40 group-hover:opacity-100 disabled:hidden"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <DocumentSidebar
        documents={documents}
        loading={loading}
        onIngestSamples={onIngestSamples}
        onUpload={onUpload}
        onToggleMount={onToggleMount}
        onDelete={onDelete}
        onClearAll={onClearAll}
        embedded
        className="min-h-0 flex-1"
      />
    </aside>
  );
}
