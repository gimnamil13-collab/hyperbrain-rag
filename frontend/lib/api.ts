import { API_BASE } from "./utils";

export type DocumentItem = {
  name: string;
  mounted: boolean;
  is_sample: boolean;
};

export type SourceItem = {
  id: number;
  source: string;
  page: number | null;
  preview: string;
  content: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: SourceItem[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
};

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error("Failed to load documents");
  return res.json() as Promise<{ documents: DocumentItem[]; total: number }>;
}

export async function ingestSamples() {
  const res = await fetch(`${API_BASE}/api/documents/samples`, { method: "POST" });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Sample ingest failed");
  }
  return res.json();
}

export async function uploadFiles(files: FileList | File[]) {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append("files", f));
  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function toggleMount(name: string, mounted: boolean) {
  const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(name)}/mount`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mounted }),
  });
  if (!res.ok) throw new Error("Mount toggle failed");
  return res.json();
}

export async function deleteDocument(name: string) {
  const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

export async function clearAllDocuments() {
  const res = await fetch(`${API_BASE}/api/documents`, { method: "DELETE" });
  if (!res.ok) throw new Error("Clear failed");
  return res.json();
}

export async function fetchConversations() {
  const res = await fetch(`${API_BASE}/api/conversations`);
  if (!res.ok) throw new Error("Failed to load conversations");
  return res.json() as Promise<{ conversations: Conversation[] }>;
}

export async function createConversation(title?: string) {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json() as Promise<Conversation>;
}

export async function deleteConversation(id: string) {
  const res = await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
  return res.json();
}

export async function streamChat(
  conversationId: string,
  message: string,
  onToken: (token: string) => void,
  onSources: (sources: SourceItem[]) => void,
  onError: (msg: string) => void,
) {
  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Chat failed");
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const data = JSON.parse(payload);
        if (data.type === "token") onToken(data.content);
        if (data.type === "sources") onSources(data.sources);
        if (data.type === "error") onError(data.message);
      } catch {
        /* skip malformed */
      }
    }
  }
}
