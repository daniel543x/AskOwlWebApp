import { ref } from "vue";
import { defineStore } from "pinia";
import { apiFetch } from "../../shared/api/http";
import type { ConversationRead } from "../../entities/history";

export const useChatStore = defineStore("chat", () => {
  const conversations = ref<ConversationRead[]>([]);
  const listLoading = ref(false);
  const listLoaded = ref(false);

  async function loadConversations(force = false): Promise<void> {
    if (listLoading.value || (listLoaded.value && !force)) {
      return;
    }
    listLoading.value = true;
    try {
      conversations.value = await apiFetch<ConversationRead[]>("/history");
      listLoaded.value = true;
    } finally {
      listLoading.value = false;
    }
  }

  function upsertConversation(conversation: ConversationRead): void {
    const index = conversations.value.findIndex((item) => item.id === conversation.id);
    if (index === -1) {
      conversations.value.unshift(conversation);
    } else {
      conversations.value.splice(index, 1, conversation);
    }
  }

  async function deleteConversation(id: string): Promise<void> {
    await apiFetch<void>(`/history/${id}`, { method: "DELETE" });
    conversations.value = conversations.value.filter((item) => item.id !== id);
  }

  function reset(): void {
    conversations.value = [];
    listLoading.value = false;
    listLoaded.value = false;
  }

  return {
    conversations,
    listLoading,
    listLoaded,
    loadConversations,
    upsertConversation,
    deleteConversation,
    reset,
  };
});
