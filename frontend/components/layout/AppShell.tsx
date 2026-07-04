"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { notify } from "@/lib/notify";
import { API_BASE } from "@/lib/utils";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
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

function readStoredPanelOpen(key: string, defaultOpen: boolean): boolean {
  const saved = localStorage.getItem(key);
  if (saved === null) return defaultOpen;
  return saved === "true";
}

export function AppShell() {
  const [bootLoading, setBootLoading] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [apiOnline, setApiOnline] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const {
    documents,
    loading,
    canChat,
    bootstrapDocuments,
    handleIngestSamples,
    handleUpload,
    handleToggleMount,
    handleDelete,
    handleClearAll,
  } = useDocuments();

  const {
    conversations,
    activeConv,
    activeSources,
    activeCitation,
    streaming,
    bootstrapConversations,
    handleSend,
    handleCancelStream,
    handleNewSession,
    handleSelectSession,
    handleDeleteSession,
    openSources,
  } = useChat({ setRightOpen, setMobilePanel });

  useLayoutEffect(() => {
    setLeftOpen(readStoredPanelOpen(STORAGE_LEFT, true));
    setRightOpen(readStoredPanelOpen(STORAGE_RIGHT, true));
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

  useEffect(() => {
    (async () => {
      const toastId = notify.loading("신경망 연결 중...");
      try {
        const health = await fetch(`${API_BASE}/api/health`);
        if (!health.ok) throw new Error("API offline");
        setApiOnline(true);
        await bootstrapDocuments();
        await bootstrapConversations();
        notify.dismiss(toastId);
      } catch {
        setApiOnline(false);
        notify.dismiss(toastId);
        notify.error("백엔드(API)에 연결할 수 없습니다. 실행.bat을 확인하세요.");
      } finally {
        setBootLoading(false);
      }
    })();
  }, [bootstrapDocuments, bootstrapConversations]);

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
              onCancel={handleCancelStream}
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
