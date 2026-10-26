<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Message from "primevue/message";
import Select from "primevue/select";
import SelectButton from "primevue/selectbutton";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import { useToast } from "primevue/usetoast";
import {
    ArrowPathIcon,
    BoltIcon,
    CheckCircleIcon,
    ClipboardDocumentListIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    MagnifyingGlassIcon,
    PaperAirplaneIcon,
    StopIcon,
} from "@heroicons/vue/24/outline";
import { apiFetch, ApiError } from "../../shared/api/http";
import { renderMarkdown } from "../../shared/utils/markdown";
import { useChatStore } from "../../features/chat/chatStore";
import { useChatThread, type ChatMode } from "../../features/chat/useChatThread";
import type { ModelEntry, PreferenceRead } from "../../entities/models";
import type { PersonaRead } from "../../entities/persona";
import AppLogo from "../../components/AppLogo.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const chatStore = useChatStore();
const thread = useChatThread();

const draft = ref("");
const scrollEl = ref<HTMLElement | null>(null);
const mode = ref<ChatMode>("search");
const personas = ref<PersonaRead[]>([]);
const personaId = ref<string | null>(null);

const modeOptions = [
  { label: "Search", value: "search" as const },
  { label: "Research", value: "research" as const },
  { label: "Agent", value: "agent" as const },
];

const composerPlaceholder = computed(() => {
  switch (mode.value) {
    case "research":
      return "Ask a research question…";
    case "agent":
      return "Describe a goal…";
    default:
      return "Ask anything…";
  }
});

const models = ref<ModelEntry[]>([]);
const selectedModelId = ref<string | null>(null);

const modelOptions = computed(() =>
  models.value.map((model) => ({
    id: model.id,
    label: model.display_name || model.model_name,
  })),
);

onMounted(async () => {
  try {
    const [list, preferences] = await Promise.all([
      apiFetch<ModelEntry[]>("/models", { params: { kind: "chat" } }),
      apiFetch<PreferenceRead[]>("/models/preferences"),
    ]);
    models.value = list.filter((model) => model.is_active);
    selectedModelId.value =
      preferences.find((preference) => preference.kind === "chat")?.selected_model_id ?? null;
  } catch {
    // picker stays hidden; backend defaults are used
  }
  try {
    personas.value = await apiFetch<PersonaRead[]>("/personas");
  } catch {
    // persona selector stays hidden in agent mode
  }
});

watch(
  () => route.fullPath,
  () => {
    if (route.name === "conversation") {
      const id = route.params.conversationId as string;
      thread.loadConversation(id).catch((error: unknown) => {
        toast.add({
          severity: "error",
          summary: "Conversation unavailable",
          detail:
            error instanceof ApiError && error.status === 404
              ? "This conversation does not exist."
              : error instanceof Error
                ? error.message
                : "Could not load the conversation.",
          life: 6000,
        });
        router.replace({ name: "chat" });
      });
    } else if (route.name === "chat") {
      thread.reset();
    }
  },
  { immediate: true },
);

watch(thread.messages, scrollToBottom, { deep: true });

function scrollToBottom(): void {
  void nextTick(() => {
    const el = scrollEl.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void send();
  }
}

async function send(): Promise<void> {
  const query = draft.value.trim();
  if (query.length === 0 || thread.streaming.value) {
    return;
  }
  draft.value = "";
  if (mode.value === "research") {
    await thread.submitResearch(query, { modelId: selectedModelId.value });
    return;
  }
  if (mode.value === "agent") {
    await thread.submitAgent(query, {
      modelId: selectedModelId.value,
      personaId: personaId.value,
    });
    return;
  }
  await thread.submit(query, {
    modelId: selectedModelId.value,
    onNewConversation: (id) => {
      const summary = thread.conversationSummary();
      if (summary) {
        chatStore.upsertConversation(summary);
      }
      void router.replace({ name: "conversation", params: { conversationId: id } });
    },
  });
  chatStore.loadConversations(true).catch(() => undefined);
}

onBeforeUnmount(() => {
  thread.reset();
});
</script>

<template>
    <section class="chat-view">
        <header class="chat-header">
            <SelectButton
                v-model="mode"
                class="mode-switcher"
                :options="modeOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                :disabled="thread.streaming.value"
            />
        </header>

        <div ref="scrollEl" class="thread">
            <div v-if="thread.loadingHistory.value" class="thread-note">
                <ArrowPathIcon class="askowl-icon spin" />
                Loading conversation…
            </div>

            <div v-else-if="thread.messages.value.length === 0" class="hero">
                <div class="hero-mark">
                    <AppLogo :size="56" />
                </div>
                <h1 class="hero-title">What do you want to know?</h1>
                <p class="hero-subtitle">
                    Ask anything. AskOwl searches the web, ranks the results, and answers with
                    citations.
                </p>
            </div>

            <template v-for="message in thread.messages.value" :key="message.id">
                <article v-if="message.role === 'user'" class="turn turn-user">
                    <div class="user-bubble">{{ message.content }}</div>
                </article>

                <article v-else class="turn turn-assistant">
                    <div v-if="message.plan" class="plan-block">
                        <div class="plan-title">
                            <ClipboardDocumentListIcon class="askowl-icon" />
                            <span>Research plan</span>
                        </div>
                        <ul class="plan-list">
                            <li
                                v-for="subquestion in message.plan.subquestions"
                                :key="subquestion"
                                :class="{ done: message.subqueries?.[subquestion]?.sources }"
                            >
                                <CheckCircleIcon
                                    v-if="message.subqueries?.[subquestion]?.sources"
                                    class="askowl-icon step-done"
                                />
                                <span v-else class="step-todo"></span>
                                <span>{{ subquestion }}</span>
                                <span
                                    v-if="message.subqueries?.[subquestion]?.chunks"
                                    class="plan-chunks"
                                >
                                    {{ message.subqueries[subquestion].chunks }} chunks
                                </span>
                            </li>
                        </ul>
                    </div>

                    <details v-if="message.activity && message.activity.length > 0" class="activity-log">
                        <summary>
                            <BoltIcon class="askowl-icon" />
                            Activity ({{ message.activity.length }})
                        </summary>
                        <ul>
                            <li v-for="(entry, index) in message.activity" :key="index">
                                {{ entry }}
                            </li>
                        </ul>
                    </details>

                    <div
                        v-if="message.status"
                        class="activity-line"
                    >
                        <ArrowPathIcon class="askowl-icon spin" />
                        <span>{{ message.status }}</span>
                        <span v-if="message.chunks !== undefined && message.chunks !== null" class="activity-detail">
                            {{ message.chunks }} chunks selected
                        </span>
                    </div>
                    <div
                        v-else-if="message.searchedQuery"
                        class="activity-line done"
                    >
                        <MagnifyingGlassIcon class="askowl-icon" />
                        <span>Searched: {{ message.searchedQuery }}</span>
                    </div>

                    <div v-if="message.sources && message.sources.length > 0" class="source-chips">
                        <a
                            v-for="source in message.sources"
                            :key="source.url"
                            class="source-chip"
                            :href="source.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            :title="source.url"
                        >
                            <span class="source-title">{{ source.title || source.url }}</span>
                            <span class="source-score">{{ Math.round(source.score * 100) }}%</span>
                        </a>
                    </div>

                    <div
                        v-if="message.content"
                        class="markdown-body assistant-answer"
                        v-html="renderMarkdown(message.content)"
                    ></div>

                    <div v-if="message.streaming && !message.content && !message.status" class="activity-line">
                        <ArrowPathIcon class="askowl-icon spin" />
                        <span>Generating answer…</span>
                    </div>

                    <div v-if="message.grounding !== null && message.grounding !== undefined" class="assistant-meta">
                        <Tag
                            :severity="message.grounding >= 0.7 ? 'success' : 'warn'"
                            rounded
                        >
                            <CheckCircleIcon class="askowl-icon" style="font-size: 0.75rem" />
                            Grounded {{ Math.round(message.grounding * 100) }}%
                        </Tag>
                    </div>

                    <Message v-if="message.error" severity="error" class="thread-message">
                        <template #icon><ExclamationTriangleIcon class="askowl-icon" /></template>
                        {{ message.error }}
                    </Message>
                    <Message
                        v-else-if="message.notice?.kind === 'no_context'"
                        severity="info"
                        class="thread-message"
                    >
                        <template #icon><InformationCircleIcon class="askowl-icon" /></template>
                        No usable content was found for this question. Try rephrasing it.
                    </Message>
                    <Message
                        v-else-if="message.notice?.kind === 'budget_exhausted'"
                        severity="warn"
                        class="thread-message"
                    >
                        <template #icon><ExclamationCircleIcon class="askowl-icon" /></template>
                        Stopped early{{ message.notice.reason ? ` (${message.notice.reason})` : "" }} —
                        the answer is based on partial context.
                    </Message>
                </article>
            </template>
        </div>

        <footer class="composer-wrap">
            <div class="composer">
                <Textarea
                    v-model="draft"
                    class="composer-input"
                    auto-resize
                    rows="1"
                    :placeholder="composerPlaceholder"
                    :disabled="thread.streaming.value"
                    @keydown="onKeydown"
                />
                <Button
                    v-if="!thread.streaming.value"
                    class="composer-send"
                    rounded
                    :disabled="draft.trim().length === 0"
                    aria-label="Send message"
                    @click="send()"
                >
                    <template #icon><PaperAirplaneIcon class="askowl-icon" /></template>
                </Button>
                <Button
                    v-else
                    v-tooltip.bottom="'Stop generating'"
                    class="composer-send"
                    severity="danger"
                    rounded
                    aria-label="Stop generating"
                    @click="thread.stop()"
                >
                    <template #icon><StopIcon class="askowl-icon" /></template>
                </Button>
            </div>
            <div class="composer-foot">
                <Select
                    v-if="mode === 'agent' && personas.length > 0"
                    v-model="personaId"
                    class="persona-picker"
                    :options="personas"
                    option-label="name"
                    option-value="id"
                    placeholder="No persona"
                    :disabled="thread.streaming.value"
                />
                <Select
                    v-if="modelOptions.length > 0"
                    v-model="selectedModelId"
                    class="model-picker"
                    :options="modelOptions"
                    option-label="label"
                    option-value="id"
                    placeholder="Backend default model"
                    :disabled="thread.streaming.value"
                />
            </div>
        </footer>
    </section>
</template>

<style scoped>
.chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.chat-header {
    display: flex;
    justify-content: center;
    padding: 0.625rem 1rem 0;
}

.mode-switcher {
    font-size: 0.8125rem;
}

.plan-block {
    margin: 0.5rem 0;
    padding: 0.875rem 1.125rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
    background: var(--p-card-background);
}

.plan-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--p-text-color);
    margin-bottom: 0.375rem;
}

.plan-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.plan-list li {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--p-text-muted-color);
}

.plan-list li.done {
    color: var(--p-text-color);
}

.plan-list li .step-done {
    color: var(--askowl-lime);
}

.step-todo {
    width: 0.75em;
    height: 0.75em;
    flex-shrink: 0;
    border: 1.5px solid currentColor;
    border-radius: 9999px;
    opacity: 0.75;
}

.plan-chunks {
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
}

.activity-log {
    margin: 0.375rem 0;
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
}

.activity-log summary {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    user-select: none;
}

.activity-log ul {
    margin: 0.375rem 0 0;
    padding-left: 1.25rem;
    max-height: 10rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.thread {
    flex: 1;
    overflow-y: auto;
    scroll-behavior: smooth;
}

.thread-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--p-text-muted-color);
}

.hero {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
}

.hero-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.5rem;
    height: 4.5rem;
    margin-bottom: 1.25rem;
    border-radius: 9999px;
    background: var(--p-surface-400);
    color: var(--p-text-color);
}

.hero-title {
    margin: 0 0 0.5rem;
    font-size: 2.5rem;
    font-weight: 400;
    letter-spacing: -0.01em;
}

.hero-subtitle {
    margin: 0;
    max-width: 32rem;
    color: var(--p-text-muted-color);
    font-size: 0.9375rem;
    line-height: 1.5;
}

.turn {
    padding: 0.75rem 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
    width: 100%;
}

.turn-user {
    display: flex;
    justify-content: flex-end;
}

.user-bubble {
    max-width: 80%;
    background: var(--p-primary-color);
    color: var(--p-primary-contrast-color);
    border-radius: 1.125rem 1.125rem 0.375rem 1.125rem;
    padding: 0.625rem 1rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.turn-assistant {
    padding-top: 1rem;
    padding-bottom: 1rem;
}

.activity-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--p-text-muted-color);
    font-size: 0.8125rem;
    padding: 0.25rem 0;
}

.activity-line.done {
    color: var(--p-text-color);
}

.activity-detail {
    color: var(--p-text-muted-color);
}

.source-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin: 0.5rem 0;
}

.source-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    max-width: 16rem;
    padding: 0.3125rem 0.75rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 200px;
    text-decoration: none;
    font-size: 0.75rem;
    color: var(--p-text-color);
    background: var(--p-card-background);
    transition: border-color 0.15s ease;
}

.source-chip:hover {
    border-color: var(--p-text-color);
}

.source-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.source-score {
    color: var(--p-text-muted-color);
    font-weight: 500;
    flex-shrink: 0;
}

.assistant-answer {
    color: var(--p-text-color);
    line-height: 1.65;
}

.assistant-meta {
    margin-top: 0.5rem;
}

.thread-message {
    margin-top: 0.5rem;
}

.composer-wrap {
    padding: 0 1.5rem 1rem;
}

.composer {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    max-width: 56rem;
    margin: 0 auto;
    padding: 0.5rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
    background: var(--p-card-background);
}

.composer-input {
    flex: 1;
    border: none;
    box-shadow: none;
    background: transparent;
    resize: none;
    max-height: 12rem;
}

.composer-input:global(.p-textarea):focus {
    outline: none;
    box-shadow: none;
}

.composer-send {
    flex-shrink: 0;
}

.composer-foot {
    max-width: 56rem;
    margin: 0.5rem auto 0;
    display: flex;
    gap: 0.5rem;
}

.persona-picker,
.model-picker {
    font-size: 0.8125rem;
}
</style>
