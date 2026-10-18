<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Skeleton from "primevue/skeleton";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { useAuthStore } from "../../features/auth/authStore";
import { useChatStore } from "../../features/chat/chatStore";
import { useTheme } from "../../shared/theme/theme";
import { ApiError } from "../../shared/api/http";
import { formatRelativeTime } from "../../shared/utils/relativeTime";
import AppLogo from "../AppLogo.vue";
import type { ConversationRead } from "../../entities/history";

defineProps<{ inDrawer?: boolean }>();
const emit = defineEmits<{ navigate: [] }>();

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const auth = useAuthStore();
const chat = useChatStore();
const { mode, toggle } = useTheme();

const activeId = computed(() =>
  route.name === "conversation" ? (route.params.conversationId as string) : null,
);

onMounted(() => {
  chat.loadConversations().catch((error: unknown) => {
    toast.add({
      severity: "error",
      summary: "History unavailable",
      detail: error instanceof ApiError ? error.message : "Could not load conversations.",
      life: 6000,
    });
  });
});

function askDelete(conversation: ConversationRead): void {
  confirm.require({
    message: `Delete "${conversation.title}"? This cannot be undone.`,
    header: "Delete conversation",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    accept: async () => {
      try {
        await chat.deleteConversation(conversation.id);
        if (activeId.value === conversation.id) {
          await router.push({ name: "chat" });
        }
      } catch (error: unknown) {
        toast.add({
          severity: "error",
          summary: "Delete failed",
          detail: error instanceof ApiError ? error.message : "Unexpected error.",
          life: 6000,
        });
      }
    },
  });
}

async function logout(): Promise<void> {
  auth.logout();
  chat.reset();
  await router.push({ name: "login" });
}
</script>

<template>
    <nav class="sidebar">
        <div class="sidebar-header">
            <RouterLink class="brand" :to="{ name: 'chat' }" @click="emit('navigate')">
                <AppLogo :size="26" />
                <span class="brand-name">AskOwl</span>
            </RouterLink>
            <Button
                v-if="inDrawer"
                class="drawer-close"
                icon="pi pi-times"
                text
                rounded
                severity="secondary"
                aria-label="Close menu"
                @click="emit('navigate')"
            />
        </div>

        <RouterLink
            class="new-chat"
            :class="{ active: route.name === 'chat' }"
            :to="{ name: 'chat' }"
            @click="emit('navigate')"
        >
            <i class="pi pi-plus"></i>
            <span>New chat</span>
        </RouterLink>

        <div class="conversation-list">
            <template v-if="chat.listLoading">
                <div v-for="i in 4" :key="i" class="skeleton-item">
                    <Skeleton height="0.875rem" width="80%" />
                    <Skeleton height="0.625rem" width="35%" />
                </div>
            </template>
            <p v-else-if="chat.conversations.length === 0" class="list-note">
                No conversations yet.
                <br />
                Ask your first question!
            </p>
            <RouterLink
                v-for="conversation in chat.conversations"
                v-else
                :key="conversation.id"
                class="conversation-item"
                :class="{ active: conversation.id === activeId }"
                :to="{ name: 'conversation', params: { conversationId: conversation.id } }"
                @click="emit('navigate')"
            >
                <span class="conversation-title">{{ conversation.title }}</span>
                <span class="conversation-meta">
                    <span class="conversation-date">
                        {{ formatRelativeTime(conversation.updated_at ?? conversation.created_at) }}
                    </span>
                    <Button
                        class="delete-btn"
                        icon="pi pi-trash"
                        text
                        rounded
                        severity="danger"
                        aria-label="Delete conversation"
                        @click.prevent="askDelete(conversation)"
                    />
                </span>
            </RouterLink>
        </div>

        <div class="sidebar-footer">
            <RouterLink
                class="nav-item"
                :class="{ active: route.name === 'settings' }"
                :to="{ name: 'settings' }"
                @click="emit('navigate')"
            >
                <i class="pi pi-cog"></i>
                <span>Settings</span>
            </RouterLink>
            <div class="user-row">
                <i class="pi pi-user user-icon"></i>
                <span class="nickname" :title="auth.user?.email">{{ auth.user?.nickname ?? "…" }}</span>
                <Button
                    :icon="mode === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"
                    text
                    rounded
                    severity="secondary"
                    :aria-label="mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                    @click="toggle()"
                />
                <Button
                    icon="pi pi-sign-out"
                    text
                    rounded
                    severity="secondary"
                    aria-label="Log out"
                    @click="logout()"
                />
            </div>
        </div>
    </nav>
</template>

<style scoped>
.sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 0.75rem 0.5rem;
}

@media (min-width: 901px) {
    .drawer-close {
        display: none;
    }
}

.brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--p-text-color);
    font-weight: 700;
    font-size: 1.05rem;
}

.brand :deep(svg),
.brand-name {
    color: var(--p-primary-color);
}

.new-chat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.25rem 0.75rem 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--p-text-color);
    font-weight: 600;
    font-size: 0.9rem;
    transition: background-color 0.15s ease, border-color 0.15s ease;
}

.new-chat:hover {
    background: var(--p-content-hover-background);
}

.new-chat.active {
    background: color-mix(in oklab, var(--p-primary-color) 14%, transparent);
    border-color: color-mix(in oklab, var(--p-primary-color) 35%, transparent);
    color: var(--p-primary-color);
}

.conversation-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.list-note {
    margin: 0.5rem;
    padding: 0.75rem;
    text-align: center;
    color: var(--p-text-muted-color);
    font-size: 0.875rem;
    line-height: 1.5;
}

.skeleton-item {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.625rem;
}

.conversation-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--p-text-color);
    font-size: 0.875rem;
}

.conversation-item:hover {
    background: var(--p-content-hover-background);
}

.conversation-item.active {
    background: color-mix(in oklab, var(--p-primary-color) 14%, transparent);
    color: var(--p-primary-color);
}

.conversation-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.conversation-date {
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
}

.delete-btn {
    opacity: 0;
    width: 1.75rem;
    height: 1.75rem;
}

.conversation-item:hover .delete-btn,
.conversation-item:focus-within .delete-btn {
    opacity: 1;
}

.sidebar-footer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem 0.875rem;
    border-top: 1px solid var(--p-content-border-color);
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--p-text-color);
    font-size: 0.9rem;
    font-weight: 600;
}

.nav-item:hover {
    background: var(--p-content-hover-background);
}

.nav-item.active {
    background: color-mix(in oklab, var(--p-primary-color) 14%, transparent);
    color: var(--p-primary-color);
}

.user-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-top: 0.375rem;
}

.user-icon {
    color: var(--p-text-muted-color);
    margin: 0 0.375rem;
}

.nickname {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
    font-weight: 600;
}
</style>
