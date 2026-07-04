"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import type { Conversation, Message } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  conversation: Conversation | null;
  canChat: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onCancel: () => void;
  activeCitation: number | null;
  onCitationClick: (id: number) => void;
  className?: string;
};

function MessageBubble({
  msg,
  activeCitation,
  onCitationClick,
  citationRefs,
}: {
  msg: Message;
  activeCitation: number | null;
  onCitationClick: (id: number) => void;
  citationRefs: MutableRefObject<Map<number, HTMLButtonElement>>;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "border border-cyber-purple/30 bg-purple-950/30 text-slate-100"
            : "glass-panel text-slate-200",
        )}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="markdown-body prose-invert prose-sm max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1 border-t border-cyber-border pt-2">
            {msg.sources.map((s) => {
              const isActive = activeCitation === s.id;
              return (
                <motion.button
                  key={s.id}
                  ref={(el) => {
                    if (el) citationRefs.current.set(s.id, el);
                    else citationRefs.current.delete(s.id);
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onCitationClick(s.id)}
                  className={cn(
                    "rounded border px-2 py-0.5 font-display text-[10px] transition-colors",
                    isActive
                      ? "border-cyber-cyan bg-cyan-950/60 text-cyan-200 shadow-neon-sm"
                      : "border-cyan-800/60 text-cyber-cyan hover:border-cyber-cyan hover:shadow-neon-sm",
                  )}
                >
                  [{s.id}] {s.source}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ChatPanel({
  conversation,
  canChat,
  streaming,
  onSend,
  onCancel,
  activeCitation,
  onCitationClick,
  className,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const citationRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, streaming]);

  useEffect(() => {
    if (activeCitation == null) return;
    const el = citationRefs.current.get(activeCitation);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeCitation]);

  const submit = () => {
    const text = input.trim();
    if (!text || !canChat || streaming) return;
    setInput("");
    onSend(text);
  };

  const sessionTitle = conversation?.title || "NEW SESSION";

  return (
    <main className={cn("glass-panel flex min-w-0 flex-1 flex-col rounded-2xl", className)}>
      <header className="border-b border-cyber-border px-4 py-3 md:px-6 md:py-3.5">
        <h1 className="font-display text-sm font-bold tracking-wide neon-text md:text-base">
          HYPERBRAIN RAG
        </h1>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {sessionTitle}
        </p>
      </header>

      <div className="scrollbar-cyber flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
        {!conversation || conversation.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="mb-4 h-10 w-10 text-cyber-cyan animate-pulse-glow" />
            <p className="font-display text-sm tracking-wider text-cyber-cyan">SYSTEM READY</p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              {canChat
                ? "지식 노드를 로드했습니다. 아래에 질의를 입력하세요."
                : "왼쪽 패널에서 샘플 노드를 로드하거나 파일을 업로드하세요."}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {conversation.messages.map((msg, i) => (
              <MessageBubble
                key={`${conversation.id}-${i}`}
                msg={msg}
                activeCitation={activeCitation}
                onCitationClick={onCitationClick}
                citationRefs={citationRefs}
              />
            ))}
          </AnimatePresence>
        )}
        {streaming && (
          <div className="flex items-center gap-2 text-xs text-cyber-cyan">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="font-display">STREAMING...</span>
            <span className="animate-pulse">▌</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-cyber-border p-4 md:px-6">
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
            disabled={!canChat || streaming}
            placeholder={canChat ? "NEURAL QUERY · 질문을 입력..." : "노드 등록 후 질의 가능"}
            className="cyber-input flex-1 disabled:opacity-40"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={streaming ? onCancel : submit}
            disabled={!canChat || (!streaming && !input.trim())}
            aria-label={streaming ? "스트리밍 중지" : "질의 전송"}
            className={cn(
              "flex items-center gap-1 px-4 disabled:opacity-40",
              streaming
                ? "rounded-lg border border-red-500/50 bg-red-950/40 text-red-300 hover:border-red-400 hover:bg-red-950/60"
                : "neon-button",
            )}
          >
            {streaming ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
