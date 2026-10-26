<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Skeleton from "primevue/skeleton";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import { useAuthStore } from "../../features/auth/authStore";
import { useChatStore } from "../../features/chat/chatStore";
import { useTheme } from "../../shared/theme/theme";
import {
    ArrowRightStartOnRectangleIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    Cog6ToothIcon,
    EllipsisHorizontalIcon,
    MoonIcon,
    PencilIcon,
    PlusIcon,
    ServerStackIcon,
    SunIcon,
    TrashIcon,
    UserIcon,
    XMarkIcon,
} from "@heroicons/vue/24/outline";
import { ApiError } from "../../shared/api/http";
import AppLogo from "../AppLogo.vue";
import type { ConversationRead } from "../../entities/history";

defineProps<{ inDrawer?: boolean }>();
const emit = defineEmits<{ navigate: [] }>();

const collapsed = defineModel<boolean>({ default: false });

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

interface ConversationGroup {
  label: string;
  items: ConversationRead[];
}

const DAY_MS = 86_400_000;

function conversationDate(conversation: ConversationRead): Date {
  return new Date(conversation.updated_at ?? conversation.created_at);
}

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

const groupedConversations = computed<ConversationGroup[]>(() => {
  const today = startOfDay(new Date());
  const groups = new Map<string, ConversationRead[]>();
  const sorted = [...chat.conversations].sort(
    (a, b) => conversationDate(b).getTime() - conversationDate(a).getTime(),
  );
  for (const conversation of sorted) {
    const date = conversationDate(conversation);
    const daysAgo = Math.round((today - startOfDay(date)) / DAY_MS);
    let label: string;
    if (daysAgo < 1) {
      label = "Today";
    } else if (daysAgo < 2) {
      label = "Yesterday";
    } else if (daysAgo < 7) {
      label = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
    } else {
      label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
    }
    const group = groups.get(label);
    if (group) {
      group.push(conversation);
    } else {
      groups.set(label, [conversation]);
    }
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
});

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
  itemMenuId.value = null;
  confirm.require({
    message: `Delete "${conversation.title}"? This cannot be undone.`,
    header: "Delete conversation",
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
  await auth.logout();
  chat.reset();
  await router.push({ name: "login" });
}

const itemMenuId = ref<string | null>(null);
const itemMenuStyle = ref<Record<string, string>>({});

function toggleItemMenu(event: MouseEvent, id: string): void {
  if (itemMenuId.value === id) {
    itemMenuId.value = null;
    return;
  }
  const anchor = event.currentTarget;
  if (anchor instanceof HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    itemMenuStyle.value = {
      top: `${Math.max(8, Math.min(rect.top, window.innerHeight - 128))}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  }
  itemMenuId.value = id;
}

const renameOpen = ref(false);
const renaming = ref<ConversationRead | null>(null);
const renameValue = ref("");

function startRename(conversation: ConversationRead): void {
  itemMenuId.value = null;
  renaming.value = conversation;
  renameValue.value = conversation.title;
  renameOpen.value = true;
}

function submitRename(): void {
  const conversation = renaming.value;
  const title = renameValue.value.trim();
  if (!conversation || title.length === 0) {
    return;
  }
  chat.renameConversation(conversation.id, title);
  renameOpen.value = false;
}

const menuOpen = ref(false);
const userRowEl = ref<HTMLElement | null>(null);
const menuBtnEl = ref<HTMLElement | null>(null);
const menuStyle = ref<Record<string, string>>({});

function closeMenu(): void {
  menuOpen.value = false;
}

function closeMenuAndNavigate(): void {
  menuOpen.value = false;
  emit("navigate");
}

function toggleThemeFromMenu(): void {
  toggle();
  closeMenu();
}

function toggleMenu(): void {
  if (menuOpen.value) {
    menuOpen.value = false;
    return;
  }
  const anchor = menuBtnEl.value;
  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    menuStyle.value = collapsed.value
      ? {
          left: `${rect.right + 8}px`,
          bottom: `${window.innerHeight - rect.bottom}px`,
        }
      : {
          right: `${window.innerWidth - rect.right}px`,
          bottom: `${window.innerHeight - rect.top + 8}px`,
        };
  }
  menuOpen.value = true;
}

watch(collapsed, () => {
  menuOpen.value = false;
});

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
    itemMenuId.value = null;
  },
);

function onDocumentClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (menuOpen.value && userRowEl.value && !userRowEl.value.contains(target)) {
    menuOpen.value = false;
  }
  if (itemMenuId.value !== null && !target.closest(".conversation-item")) {
    itemMenuId.value = null;
  }
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
});
</script>

<template>
    <nav class="sidebar" :class="{ collapsed }">
        <div class="sidebar-header">
            <RouterLink class="brand" :to="{ name: 'chat' }" @click="emit('navigate')">
                <AppLogo :size="26" />
                <span class="brand-name">AskOwl</span>
            </RouterLink>
            <Button
                v-if="inDrawer"
                class="drawer-close"
                text
                rounded
                severity="secondary"
                aria-label="Close menu"
                @click="emit('navigate')"
            >
                <template #icon><XMarkIcon class="askowl-icon" /></template>
            </Button>
            <Button
                class="collapse-btn"
                text
                rounded
                severity="secondary"
                :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                @click="collapsed = !collapsed"
            >
                <template #icon>
                    <ChevronDoubleRightIcon v-if="collapsed" class="askowl-icon" />
                    <ChevronDoubleLeftIcon v-else class="askowl-icon" />
                </template>
            </Button>
        </div>

        <RouterLink
            class="new-chat"
            aria-label="New chat"
            :to="{ name: 'chat' }"
            @click="emit('navigate')"
        >
            <PlusIcon class="askowl-icon" />
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
            <template v-else>
                <div
                    v-for="group in groupedConversations"
                    :key="group.label"
                    class="conversation-group"
                >
                    <p class="group-label">{{ group.label }}</p>
                    <div
                        v-for="conversation in group.items"
                        :key="conversation.id"
                        class="conversation-item"
                        :class="{ active: conversation.id === activeId }"
                    >
                        <RouterLink
                            class="conversation-link"
                            :to="{ name: 'conversation', params: { conversationId: conversation.id } }"
                            @click="emit('navigate')"
                        >
                            <span class="conversation-title">{{ conversation.title }}</span>
                        </RouterLink>
                        <span class="item-anchor">
                            <Button
                                class="item-menu-btn"
                                text
                                rounded
                                severity="secondary"
                                aria-label="Conversation options"
                                @click="toggleItemMenu($event, conversation.id)"
                            >
                                <template #icon><EllipsisHorizontalIcon class="askowl-icon" /></template>
                            </Button>
                        </span>
                        <div
                            v-if="itemMenuId === conversation.id"
                            class="item-menu"
                            :style="itemMenuStyle"
                        >
                            <button class="menu-item" type="button" @click="startRename(conversation)">
                                <PencilIcon class="askowl-icon" />
                                <span>Rename</span>
                            </button>
                            <button class="menu-item menu-item-danger" type="button" @click="askDelete(conversation)">
                                <TrashIcon class="askowl-icon" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <div class="sidebar-footer">
            <div ref="userRowEl" class="user-row">
                <UserIcon class="askowl-icon user-icon" />
                <span class="nickname" :title="auth.user?.email">{{ auth.user?.nickname ?? "…" }}</span>
                <span ref="menuBtnEl" class="menu-anchor">
                    <Button
                        text
                        rounded
                        severity="secondary"
                        aria-label="Open user menu"
                        :aria-expanded="menuOpen"
                        @click="toggleMenu()"
                    >
                        <template #icon><EllipsisHorizontalIcon class="askowl-icon" /></template>
                    </Button>
                </span>
                <div v-if="menuOpen" class="user-menu" :style="menuStyle">
                    <button class="menu-item" type="button" @click="toggleThemeFromMenu()">
                        <SunIcon v-if="mode === 'dark'" class="askowl-icon" />
                        <MoonIcon v-else class="askowl-icon" />
                        <span>{{ mode === "dark" ? "Light theme" : "Dark theme" }}</span>
                    </button>
                    <RouterLink class="menu-item" :to="{ name: 'settings' }" @click="closeMenuAndNavigate()">
                        <Cog6ToothIcon class="askowl-icon" />
                        <span>Settings</span>
                    </RouterLink>
                    <RouterLink class="menu-item" :to="{ name: 'admin' }" @click="closeMenuAndNavigate()">
                        <ServerStackIcon class="askowl-icon" />
                        <span>Admin</span>
                    </RouterLink>
                    <button class="menu-item menu-logout" type="button" @click="logout()">
                        <ArrowRightStartOnRectangleIcon class="askowl-icon" />
                        <span>Log out</span>
                    </button>
                </div>
            </div>
        </div>

        <Dialog
            v-model:visible="renameOpen"
            modal
            header="Rename conversation"
            :style="{ width: '24rem', maxWidth: '95vw' }"
            @hide="renaming = null"
        >
            <div class="rename-body">
                <label for="rename-title">Name</label>
                <InputText
                    id="rename-title"
                    v-model="renameValue"
                    maxlength="100"
                    fluid
                    autofocus
                    @keydown.enter="submitRename()"
                />
            </div>
            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="renameOpen = false" />
                <Button
                    label="Save"
                    :disabled="renameValue.trim().length === 0"
                    @click="submitRename()"
                />
            </template>
        </Dialog>
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

    .sidebar.collapsed .sidebar-header {
        position: relative;
        justify-content: center;
    }

    .sidebar.collapsed .brand-name {
        display: none;
    }

    .sidebar.collapsed .brand {
        position: relative;
        z-index: 1;
        transition: opacity 0.15s ease;
    }

    .sidebar.collapsed .collapse-btn {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
    }

    .sidebar.collapsed .sidebar-header:hover .brand,
    .sidebar.collapsed .sidebar-header:has(:focus-visible) .brand {
        opacity: 0;
        pointer-events: none;
    }

    @media (hover: none) {
        .sidebar.collapsed .brand {
            display: none;
        }
    }

    .sidebar.collapsed .new-chat span {
        display: none;
    }

    .sidebar.collapsed .new-chat {
        padding: 0.5rem 0;
    }

    .sidebar.collapsed .conversation-list {
        display: none;
    }

    .sidebar.collapsed .user-icon,
    .sidebar.collapsed .nickname {
        display: none;
    }

    .sidebar.collapsed .user-row {
        justify-content: center;
    }
}

.collapse-btn {
    display: none;
}

@media (min-width: 901px) {
    .collapse-btn {
        display: inline-flex;
    }
}

.brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--p-text-color);
    font-weight: 500;
    font-size: 1rem;
    letter-spacing: -0.01em;
}

.brand :deep(svg) {
    color: var(--p-text-color);
}

.new-chat {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin: 0.25rem 0.75rem 0.875rem;
    padding: 0.5rem 0.875rem;
    border-radius: 200px;
    background: var(--p-primary-color);
    color: var(--p-primary-contrast-color);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
    transition: background-color 0.15s ease;
}

.new-chat:hover {
    background: var(--p-primary-hover-color);
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
    font-size: 0.8125rem;
    line-height: 1.5;
}

.skeleton-item {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.625rem;
}

.conversation-group {
    display: flex;
    flex-direction: column;
}

.group-label {
    margin: 0.625rem 0.875rem 0.25rem;
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--p-text-muted-color);
}

.conversation-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.875rem;
    border-radius: 200px;
    font-size: 0.875rem;
    transition: background-color 0.15s ease;
}

.conversation-item:hover {
    background: var(--p-content-hover-background);
}

.conversation-item.active {
    background: var(--p-content-hover-background);
    color: var(--p-text-color);
}

.conversation-link {
    flex: 1;
    min-width: 0;
    text-decoration: none;
    color: var(--p-text-color);
}

.conversation-item.active .conversation-title::before {
    content: "";
    display: inline-block;
    width: 0.375rem;
    height: 0.375rem;
    margin-right: 0.4375rem;
    margin-bottom: 0.0625rem;
    border-radius: 9999px;
    background: var(--p-primary-color);
    vertical-align: baseline;
}

.conversation-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.item-anchor {
    display: inline-flex;
    flex-shrink: 0;
}

.item-menu-btn {
    opacity: 0;
    width: 1.75rem;
    height: 1.75rem;
}

.conversation-item:hover .item-menu-btn,
.conversation-item:focus-within .item-menu-btn {
    opacity: 1;
}

.item-menu {
    position: fixed;
    z-index: 1200;
    min-width: 8.5rem;
    padding: 0.375rem;
    display: flex;
    flex-direction: column;
    background: var(--p-card-background);
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
}

.menu-item-danger {
    color: var(--askowl-red);
}

.menu-item-danger:hover {
    background: color-mix(in srgb, var(--askowl-red) 10%, transparent);
}

.rename-body {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.rename-body label {
    font-size: 0.8125rem;
    color: var(--p-text-muted-color);
}

.sidebar-footer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: auto;
    padding: 0.5rem 0.75rem 0.875rem;
    border-top: 1px solid var(--p-content-border-color);
}

.user-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-top: 0.375rem;
}

.menu-anchor {
    display: inline-flex;
}

.user-menu {
    position: fixed;
    z-index: 1200;
    min-width: 11rem;
    padding: 0.375rem;
    display: flex;
    flex-direction: column;
    background: var(--p-card-background);
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--p-text-color);
    font: inherit;
    font-size: 0.875rem;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
}

.menu-item:hover {
    background: var(--p-content-hover-background);
}

.menu-logout {
    color: var(--askowl-red);
    font-weight: 600;
}

.menu-logout:hover {
    background: color-mix(in srgb, var(--askowl-red) 10%, transparent);
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
    font-weight: 500;
}
</style>
