"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation,
  deleteConversation,
  fetchConversations,
  StreamChatAborted,
  streamChat,
  type Conversation,
  type SourceItem,
} from "@/lib/api";
import { notify } from "@/lib/notify";
import type { MobilePanel } from "@/components/layout/MobileNav";

const STORAGE_RIGHT = "hb_right_open";
const CANCEL_SUFFIX = " — (중단됨)";

type UseChatOptions = {
  setRightOpen?: (open: boolean) => void;
  setMobilePanel?: (panel: MobilePanel) => void;
};

export function useChat(options: UseChatOptions = {}) {
  const { setRightOpen, setMobilePanel } = options;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [activeSources, setActiveSources] = useState<SourceItem[]>([]);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  const syncConvMessages = useCallback((convId: string, messages: Conversation["messages"]) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages } : c)),
    );
  }, []);

  const bootstrapConversations = useCallback(async () => {
    const data = await fetchConversations();
    setConversations(data.conversations);
    if (data.conversations.length === 0) {
      const created = await createConversation();
      setConversations([created]);
      setActiveConv(created);
    } else {
      setActiveConv(data.conversations[0]);
    }
  }, []);

  const handleCancelStream = useCallback(() => {
    streamAbortRef.current?.abort();
  }, []);

  const clearCitationState = useCallback(() => {
    setActiveSources([]);
    setActiveCitation(null);
  }, []);

  const handleSend = async (text: string) => {
    if (!activeConv) return;
    const convId = activeConv.id;
    const userMsg = { role: "user" as const, content: text };
    setActiveConv({ ...activeConv, messages: [...activeConv.messages, userMsg] });
    setStreaming(true);
    setActiveSources([]);
    setActiveCitation(null);

    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    let assistantContent = "";
    let sources: SourceItem[] = [];

    try {
      await streamChat(
        convId,
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
          setRightOpen?.(true);
          localStorage.setItem(STORAGE_RIGHT, "true");
          if (window.matchMedia("(max-width: 1023px)").matches) {
            setMobilePanel?.("sources");
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
        controller.signal,
      );
      const data = await fetchConversations();
      setConversations(data.conversations);
      const updated = data.conversations.find((c) => c.id === convId);
      if (updated) setActiveConv(updated);
    } catch (err) {
      if (err instanceof StreamChatAborted) {
        if (assistantContent) {
          const finalContent = assistantContent + CANCEL_SUFFIX;
          let updatedMessages: Conversation["messages"] | null = null;
          setActiveConv((prev) => {
            if (!prev) return prev;
            const msgs = [...prev.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              msgs[msgs.length - 1] = { ...last, content: finalContent, sources };
            } else {
              msgs.push({ role: "assistant", content: finalContent, sources });
            }
            updatedMessages = msgs;
            return { ...prev, messages: msgs };
          });
          if (updatedMessages) syncConvMessages(convId, updatedMessages);
          await new Promise((resolve) => setTimeout(resolve, 250));
          try {
            const data = await fetchConversations();
            setConversations(data.conversations);
            const updated = data.conversations.find((c) => c.id === convId);
            if (updated) setActiveConv(updated);
          } catch {
            /* keep local partial if sync fails */
          }
        }
      } else {
        notify.error("질의 처리 실패 · API 키와 노드 등록을 확인하세요");
      }
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
      setStreaming(false);
    }
  };

  const handleNewSession = async () => {
    if (streaming) handleCancelStream();
    try {
      const created = await createConversation();
      setConversations((prev) => [created, ...prev]);
      setActiveConv(created);
      clearCitationState();
      setMobilePanel?.("chat");
      notify.success("새 세션 생성");
    } catch {
      notify.error("세션 생성 실패");
    }
  };

  const handleSelectSession = (id: string) => {
    if (streaming) handleCancelStream();
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setActiveConv(conv);
      clearCitationState();
      setMobilePanel?.("chat");
    }
  };

  const openSources = (id: number) => {
    setActiveCitation(id);
    setRightOpen?.(true);
    localStorage.setItem(STORAGE_RIGHT, "true");
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setMobilePanel?.("sources");
    }
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
        clearCitationState();
      }
      notify.success("세션 삭제 완료");
    } catch {
      notify.error("세션 삭제 실패");
    }
  };

  return {
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
  };
}
