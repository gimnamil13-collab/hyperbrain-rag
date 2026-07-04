"use client";

import { useCallback, useState } from "react";
import {
  clearAllDocuments,
  deleteDocument,
  fetchDocuments,
  ingestSamples,
  toggleMount,
  uploadFiles,
  type DocumentItem,
} from "@/lib/api";
import { notify } from "@/lib/notify";

const REJECT_REASON_LABELS: Record<string, string> = {
  invalid_filename: "잘못된 파일명",
  unsupported_extension: "지원하지 않는 확장자 (PDF/MD/TXT)",
  unsupported_mime: "MIME 타입 불일치",
  file_too_large: "파일 크기 초과 (10MB)",
  invalid_path: "잘못된 저장 경로",
};

function formatRejected(rejected: Array<{ name: string; reason: string }>): string {
  return rejected
    .map((r) => `${r.name}: ${REJECT_REASON_LABELS[r.reason] ?? r.reason}`)
    .join(" · ");
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshDocs = useCallback(async () => {
    const data = await fetchDocuments();
    setDocuments(data.documents);
    return data.documents;
  }, []);

  const bootstrapDocuments = useCallback(async () => {
    let docs = await refreshDocs();
    if (docs.length === 0) {
      try {
        const ingested = await ingestSamples();
        docs = await refreshDocs();
        if (ingested.status === "ok") {
          notify.info(`샘플 노드 자동 로드 · ${ingested.chunks}개 구간`);
        }
      } catch {
        /* samples optional on boot */
      }
    }
    return docs;
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

  return {
    documents,
    loading,
    canChat,
    refreshDocs,
    bootstrapDocuments,
    handleIngestSamples,
    handleUpload,
    handleToggleMount,
    handleDelete,
    handleClearAll,
  };
}
