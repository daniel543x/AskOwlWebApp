import { ref } from "vue";
import { streamSse } from "../../shared/api/sse";
import { apiFetch, ApiError } from "../../shared/api/http";
import type {
  ContextEvent,
  ConversationEvent,
  DoneEvent,
  ErrorEvent,
  GroundingEvent,
  MessageEvent,
  PlanEvent,
  QueryEvent,
  Source,
  SourcesEvent,
  StatusEvent,
} from "../../entities/ask";
import type { ConversationRead, ConversationWithMessages, Message } from "../../entities/history";

export interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  status?: string | null;
  searchedQuery?: string | null;
  chunks?: number | null;
  sources?: Source[];
  grounding?: number | null;
  plan?: { subquestions: string[]; toolCall: boolean } | null;
  subqueries?: Record<string, { sources?: Source[]; chunks?: number | null }>;
  activity?: string[];
  notice?: { kind: "no_context" | "budget_exhausted"; reason?: string } | null;
  error?: string | null;
}

export type ChatMode = "search" | "research" | "agent";

let localId = 0;

function nextId(): string {
  localId += 1;
  return `local-${localId}`;
}

function fromBackendMessage(message: Message): ThreadMessage {
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  };
}

export function useChatThread() {
  const messages = ref<ThreadMessage[]>([]);
  const conversationId = ref<string | null>(null);
  const streaming = ref(false);
  const loadingHistory = ref(false);
  let abort: AbortController | null = null;

  function reset(): void {
    abort?.abort();
    abort = null;
    messages.value = [];
    conversationId.value = null;
    streaming.value = false;
  }

  async function loadConversation(id: string): Promise<boolean> {
    if (id === conversationId.value) {
      return true;
    }
    reset();
    loadingHistory.value = true;
    try {
      const conversation = await apiFetch<ConversationWithMessages>(`/history/${id}`);
      conversationId.value = conversation.id;
      messages.value = conversation.messages.map(fromBackendMessage);
      return true;
    } finally {
      loadingHistory.value = false;
    }
  }

  function stop(): void {
    abort?.abort();
  }

  function friendlyError(cause: unknown): string {
    if (cause instanceof ApiError && cause.status === 403) {
      return "This mode requires the research role. Ask an administrator to upgrade your account.";
    }
    if (cause instanceof ApiError) {
      return cause.message;
    }
    return cause instanceof Error ? cause.message : "The request failed.";
  }

  async function runStream(
    assistantMessage: ThreadMessage,
    path: string,
    options: {
      method: "GET" | "POST";
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined | null>;
    },
    onConversation?: (id: string) => void,
  ): Promise<"completed" | "error" | "aborted"> {
    let firstDelta = true;
    const patch = (change: Partial<ThreadMessage>): void => {
      Object.assign(assistantMessage, change);
    };

    abort = new AbortController();
    try {
      let outcome: "completed" | "error" = "error";
      await streamSse(
        path,
        { ...options, signal: abort.signal },
        (frame) => {
          switch (frame.event) {
            case "conversation": {
              const data = frame.data as ConversationEvent;
              if (conversationId.value !== data.conversation_id) {
                conversationId.value = data.conversation_id;
                onConversation?.(data.conversation_id);
              }
              break;
            }
            case "status": {
              const data = frame.data as StatusEvent;
              patch({ status: data.step });
              assistantMessage.activity = [...(assistantMessage.activity ?? []), data.step];
              break;
            }
            case "query": {
              const data = frame.data as QueryEvent;
              patch({ searchedQuery: data.query });
              break;
            }
            case "plan": {
              const data = frame.data as PlanEvent;
              patch({ plan: { subquestions: data.subquestions, toolCall: data.tool_call } });
              break;
            }
            case "sources": {
              const data = frame.data as SourcesEvent;
              if (data.subquery) {
                const subqueries = { ...(assistantMessage.subqueries ?? {}) };
                subqueries[data.subquery] = {
                  ...subqueries[data.subquery],
                  sources: data.sources,
                };
                patch({ subqueries });
              } else {
                patch({ sources: data.sources });
              }
              break;
            }
            case "context": {
              const data = frame.data as ContextEvent;
              if (data.subquery) {
                const subqueries = { ...(assistantMessage.subqueries ?? {}) };
                subqueries[data.subquery] = {
                  ...subqueries[data.subquery],
                  chunks: data.chunks,
                };
                patch({ subqueries });
              } else {
                patch({ chunks: data.chunks });
              }
              break;
            }
            case "message": {
              const data = frame.data as MessageEvent;
              if (firstDelta) {
                firstDelta = false;
                patch({ status: null });
              }
              assistantMessage.content += data.text;
              break;
            }
            case "grounding": {
              const data = frame.data as GroundingEvent;
              patch({ grounding: data.supported });
              break;
            }
            case "done": {
              const data = frame.data as DoneEvent;
              outcome = "completed";
              patch({
                streaming: false,
                status: null,
                notice:
                  data.status === "no_context"
                    ? { kind: "no_context" }
                    : data.status === "budget_exhausted"
                      ? { kind: "budget_exhausted", reason: data.reason }
                      : null,
              });
              break;
            }
            case "error": {
              const data = frame.data as ErrorEvent;
              patch({ streaming: false, status: null, error: data.error });
              break;
            }
            default:
              break;
          }
        },
      );
      return outcome;
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") {
        patch({ streaming: false, status: null });
        return "aborted";
      }
      patch({ streaming: false, status: null, error: friendlyError(cause) });
      return "error";
    } finally {
      streaming.value = false;
      abort = null;
      assistantMessage.streaming = false;
    }
  }

  function pushTurn(query: string): ThreadMessage {
    messages.value.push({ id: nextId(), role: "user", content: query });
    const assistantMessage: ThreadMessage = {
      id: nextId(),
      role: "assistant",
      content: "",
      streaming: true,
      status: "Working…",
    };
    messages.value.push(assistantMessage);
    streaming.value = true;
    return assistantMessage;
  }

  async function submit(
    query: string,
    options: { modelId: string | null; onNewConversation: (id: string) => void },
  ): Promise<void> {
    if (streaming.value) {
      return;
    }
    const assistantMessage = pushTurn(query);
    await runStream(
      assistantMessage,
      "/ask/search",
      {
        method: "POST",
        body: { query, stream: true, conversation_id: conversationId.value },
        params: options.modelId ? { model_id: options.modelId } : undefined,
      },
      options.onNewConversation,
    );
  }

  async function submitResearch(
    query: string,
    options: { modelId: string | null },
  ): Promise<void> {
    if (streaming.value) {
      return;
    }
    const assistantMessage = pushTurn(query);
    await runStream(assistantMessage, "/ask/research", {
      method: "GET",
      params: {
        query,
        stream: true,
        ...(options.modelId ? { model_id: options.modelId } : {}),
      },
    });
  }

  async function submitAgent(
    goal: string,
    options: { modelId: string | null; personaId: string | null },
  ): Promise<void> {
    if (streaming.value) {
      return;
    }
    const assistantMessage = pushTurn(goal);
    await runStream(assistantMessage, "/ask/agent", {
      method: "GET",
      params: {
        goal,
        ...(options.personaId ? { persona_id: options.personaId } : {}),
        ...(options.modelId ? { model_id: options.modelId } : {}),
      },
    });
  }

  function conversationSummary(): ConversationRead | null {
    const firstUser = messages.value.find((message) => message.role === "user");
    if (!conversationId.value || !firstUser) {
      return null;
    }
    return {
      id: conversationId.value,
      title: firstUser.content.slice(0, 80),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    messages,
    conversationId,
    streaming,
    loadingHistory,
    reset,
    loadConversation,
    submit,
    submitResearch,
    submitAgent,
    stop,
    conversationSummary,
  };
}
