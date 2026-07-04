"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createConversation,
  deleteConversation,
  deleteDocument,
  clearAllDocuments,
  fetchConversations,
  fetchDocuments,
  ingestSamples,
  streamChat,
  toggleMount,
  uploadFiles,
  type Conversation,
  type DocumentItem,
  type SourceItem,
} from "@/lib/api";
import { notify } from "@/lib/notify";
import { API_BASE } from "@/lib/utils";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SourcePanel } from "@/components/sources/SourcePanel";
import { CollapsiblePanel } from "@/components/layout/CollapsiblePanel";
import { MobileNav, type MobilePanel } from "@/components/layout/MobileNav";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { cn } from "@/lib/utils";

const LEFT_WIDTH = 280;
const RIGHT_WIDTH = 340;
const STORAGE_LEFT = "hb_left_open";
const STORAGE_RIGHT = "hb_right_open";

const REJECT_REASON_LABELS: Record<string, string> = {
  invalid_filename: "잘못된 파일명",
  unsupported_extension: "지원하지 않는 확장자 (PDF/MD/TXT)",
  unsupported_mime: "MIME 타입 불일치",
  file_too_large: "파일 크기 초과 (10MB)",
  invalid_path: "잘못된 저장 경로",
};

function formatRejected(
  rejected: Array<{ name: string; reason: string }>,
): string {
  return rejected
    .map((r) => `${r.name}: ${REJECT_REASON_LABELS[r.reason] ?? r.reason}`)
    .join(" · ");
}

export function AppShell() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [activeSources, setActiveSources] = useState<SourceItem[]>([]);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [apiOnline, setApiOnline] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    const savedLeft = localStorage.getItem(STORAGE_LEFT);
    const savedRight = localStorage.getItem(STORAGE_RIGHT);
    if (savedLeft !== null) setLeftOpen(savedLeft === "true");
    if (savedRight !== null) setRightOpen(savedRight === "true");
  }, []);

  const toggleLeft = useCallback(() => {
    setLeftOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_LEFT, String(next));
      return next;
    });
  }, []);

  const toggleRight = useCallback(() => {
    setRightOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_RIGHT, String(next));
      return next;
    });
  }, []);

  const refreshDocs = useCallback(async () => {
    const data = await fetchDocuments();
    setDocuments(data.documents);
  }, []);

  useEffect(() => {
    (async () => {
      const toastId = notify.loading("신경망 연결 중...");
      try {
        const health = await fetch(`${API_BASE}/api/health`);
        if (!health.ok) throw new Error("API offline");
        setApiOnline(true);
        const docsData = await fetchDocuments();
        setDocuments(docsData.documents);
        if (docsData.documents.length === 0) {
          try {
            const ingested = await ingestSamples();
            const refreshed = await fetchDocuments();
            setDocuments(refreshed.documents);
            if (ingested.status === "ok") {
              notify.info(`샘플 노드 자동 로드 · ${ingested.chunks}개 구간`);
            }
          } catch {
            /* samples optional on boot */
          }
        }
        const data = await fetchConversations();
        setConversations(data.conversations);
        if (data.conversations.length === 0) {
          const created = await createConversation();
          setConversations([created]);
          setActiveConv(created);
        } else {
          setActiveConv(data.conversations[0]);
        }
        notify.dismiss(toastId);
      } catch {
        setApiOnline(false);
        notify.dismiss(toastId);
        notify.error("백엔드(API)에 연결할 수 없습니다. 실행.bat을 확인하세요.");
      } finally {
        setBootLoading(false);
      }
    })();
  }, [refreshDocs]);

  const canChat = documents.some((d) => d.mounted);

  const handleIngestSamples = async () => {
    setLoading(true);
    const toastId = notify.loading("샘플 노드 로드 중...");
    try {
      const res = await ingestSamples();
      await refreshDocs();
      notify.dismiss(toastId);
      if (res.status === "already_registered") {
        notify.info("샘플 노드가 이미 등록되어 있습니다.");
      } else {
        notify.success(`샘플 등록 완료 · ${res.chunks}개 구간`);
      }
    } catch (err) {
      notify.dismiss(toastId);
      const msg = err instanceof Error ? err.message : "샘플 노드 로드 실패";
      notify.error(msg.length > 80 ? "샘플 노드 로드 실패" : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList) => {
    setLoading(true);
    const toastId = notify.loading("파일 업로드 중...");
    try {
      const res = await uploadFiles(files);
      await refreshDocs();
      notify.dismiss(toastId);
      if (res.files > 0) {
        notify.success(`${res.files}개 파일 · ${res.chunks}개 구간 등록`);
      }
      if (res.skipped?.length) {
        notify.info(`이미 등록된 노드: ${res.skipped.join(", ")}`);
      }
      if (res.rejected?.length) {
        notify.info(`업로드 거부 · ${formatRejected(res.rejected)}`);
      }
      if (res.files === 0 && !res.skipped?.length && !res.rejected?.length) {
        notify.error("업로드할 유효한 파일이 없습니다");
      }
    } catch {
      notify.dismiss(toastId);
      notify.error("파일 업로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMount = async (name: string, mounted: boolean) => {
    try {
      await toggleMount(name, mounted);
      await refreshDocs();
      notify.info(mounted ? `${name} MOUNT` : `${name} UNMOUNT`);
    } catch {
      notify.error("노드 상태 변경 실패");
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteDocument(name);
      await refreshDocs();
      notify.success(`${name} PURGE 완료`);
    } catch {
      notify.error("노드 삭제 실패");
    }
  };

  const handleSend = async (text: string) => {
    if (!activeConv) return;
    const userMsg = { role: "user" as const, content: text };
    setActiveConv({ ...activeConv, messages: [...activeConv.messages, userMsg] });
    setStreaming(true);
    setActiveSources([]);
    setActiveCitation(null);

    let assistantContent = "";
    let sources: SourceItem[] = [];

    try {
      await streamChat(
        activeConv.id,
        text,
        (token) => {
          assistantContent += token;
          setActiveConv((prev) => {
            if (!prev) return prev;
            const msgs = [...prev.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              msgs[msgs.length - 1] = { ...last, content: assistantContent, sources };
            } else {
              msgs.push({ role: "assistant", content: assistantContent, sources });
            }
            return { ...prev, messages: msgs };
          });
        },
        (srcs) => {
          sources = srcs;
          setActiveSources(srcs);
          setRightOpen(true);
          localStorage.setItem(STORAGE_RIGHT, "true");
          if (window.matchMedia("(max-width: 1023px)").matches) {
            setMobilePanel("sources");
          }
          setActiveConv((prev) => {
            if (!prev) return prev;
            const msgs = [...prev.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              msgs[msgs.length - 1] = { ...last, sources: srcs };
            }
            return { ...prev, messages: msgs };
          });
        },
        (err) => notify.error(err),
      );
      const data = await fetchConversations();
      setConversations(data.conversations);
      const updated = data.conversations.find((c) => c.id === activeConv.id);
      if (updated) setActiveConv(updated);
    } catch {
      notify.error("질의 처리 실패 · API 키와 노드 등록을 확인하세요");
    } finally {
      setStreaming(false);
    }
  };

  const handleNewSession = async () => {
    try {
      const created = await createConversation();
      setConversations((prev) => [created, ...prev]);
      setActiveConv(created);
      setActiveSources([]);
      setActiveCitation(null);
      setMobilePanel("chat");
      notify.success("새 세션 생성");
    } catch {
      notify.error("세션 생성 실패");
    }
  };

  const handleSelectSession = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setActiveConv(conv);
      setActiveSources([]);
      setActiveCitation(null);
      setMobilePanel("chat");
    }
  };

  const openSources = (id: number) => {
    setActiveCitation(id);
    setRightOpen(true);
    localStorage.setItem(STORAGE_RIGHT, "true");
    setMobilePanel("sources");
    const lastAssistant = [...(activeConv?.messages ?? [])]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistant?.sources) {
      setActiveSources(lastAssistant.sources);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (conversations.length <= 1) {
      notify.info("마지막 세션은 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm("현재 세션을 삭제합니다. 계속할까요?")) return;
    try {
      await deleteConversation(id);
      const data = await fetchConversations();
      setConversations(data.conversations);
      if (activeConv?.id === id) {
        setActiveConv(data.conversations[0] ?? null);
        setActiveSources([]);
        setActiveCitation(null);
      }
      notify.success("세션 삭제 완료");
    } catch {
      notify.error("세션 삭제 실패");
    }
  };

  const handleClearAll = async () => {
    if (documents.length === 0) {
      notify.info("삭제할 노드가 없습니다.");
      return;
    }
    if (!window.confirm("모든 노드를 인덱스에서 삭제합니다. 계속할까요?")) return;
    setLoading(true);
    const toastId = notify.loading("전체 인덱스 초기화 중...");
    try {
      await clearAllDocuments();
      await refreshDocs();
      notify.dismiss(toastId);
      notify.success("전체 노드 PURGE 완료");
    } catch {
      notify.dismiss(toastId);
      notify.error("전체 초기화 실패");
    } finally {
      setLoading(false);
    }
  };

  const sidebarProps = {
    conversations,
    activeConvId: activeConv?.id ?? null,
    documents,
    loading,
    onNewSession: handleNewSession,
    onSelectSession: handleSelectSession,
    onDeleteSession: handleDeleteSession,
    onIngestSamples: handleIngestSamples,
    onUpload: handleUpload,
    onToggleMount: handleToggleMount,
    onDelete: handleDelete,
    onClearAll: handleClearAll,
  };

  return (
    <>
      <LoadingOverlay show={bootLoading} message="INITIALIZING HYPERBRAIN..." />
      {!apiOnline && !bootLoading && (
        <div className="bg-red-950/80 px-4 py-2 text-center text-xs text-red-300">
          API 오프라인 · 백엔드(포트 8000)가 실행 중인지 확인하세요
        </div>
      )}
      <div className="grid-bg flex h-[100dvh] flex-col gap-2 p-2 md:gap-2 md:p-2">
        <div className="flex min-h-0 flex-1 gap-1 md:gap-2">
          <CollapsiblePanel
            side="left"
            open={leftOpen}
            onToggle={toggleLeft}
            width={LEFT_WIDTH}
            label="PANEL"
            mobileVisible={mobilePanel === "nodes"}
          >
            <LeftSidebar {...sidebarProps} className="h-full w-full" />
          </CollapsiblePanel>

          <div
            className={cn(
              "min-h-0 min-w-0 flex-1 flex-col",
              mobilePanel === "chat" ? "flex" : "hidden",
              "lg:flex",
            )}
          >
            <ChatPanel
              conversation={activeConv}
              canChat={canChat && apiOnline}
              streaming={streaming}
              onSend={handleSend}
              activeCitation={activeCitation}
              onCitationClick={openSources}
              className="h-full w-full"
            />
          </div>

          <CollapsiblePanel
            side="right"
            open={rightOpen}
            onToggle={toggleRight}
            width={RIGHT_WIDTH}
            label="SOURCE"
            mobileVisible={mobilePanel === "sources"}
          >
            <SourcePanel
              sources={activeSources}
              activeId={activeCitation}
              onSelect={openSources}
              className="h-full w-full"
            />
          </CollapsiblePanel>
        </div>

        <MobileNav
          active={mobilePanel}
          onChange={setMobilePanel}
          sourceCount={activeSources.length}
        />
      </div>
    </>
  );
}
