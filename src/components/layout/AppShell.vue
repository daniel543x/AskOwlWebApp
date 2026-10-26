<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import { Bars3Icon, ExclamationTriangleIcon, ServerStackIcon } from "@heroicons/vue/24/outline";
import AppSidebar from "./AppSidebar.vue";
import AppLogo from "../AppLogo.vue";
import { useHealth } from "../../features/health/useHealth";

const route = useRoute();
const drawerOpen = ref(false);
const health = useHealth();

const SIDEBAR_STORAGE_KEY = "askowl.sidebar.collapsed";
const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");

watch(sidebarCollapsed, (value) => {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, value ? "1" : "0");
});

health.start();

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false;
  },
);
</script>

<template>
    <div class="app-shell" :class="{ 'drawer-open': drawerOpen }">
        <header class="mobile-bar">
            <Button
                text
                rounded
                severity="secondary"
                aria-label="Open menu"
                @click="drawerOpen = true"
            >
                <template #icon><Bars3Icon class="askowl-icon" /></template>
            </Button>
            <RouterLink class="brand" :to="{ name: 'chat' }">
                <AppLogo :size="22" />
                <span>AskOwl</span>
            </RouterLink>
        </header>

        <aside class="sidebar-pane" :class="{ collapsed: sidebarCollapsed }">
            <AppSidebar v-model="sidebarCollapsed" in-drawer @navigate="drawerOpen = false" />
        </aside>

        <div v-if="drawerOpen" class="backdrop" @click="drawerOpen = false"></div>

        <main class="main-pane">
            <RouterView />
        </main>

        <ConfirmDialog>
            <template #icon><ExclamationTriangleIcon class="askowl-icon" /></template>
        </ConfirmDialog>

        <div v-if="health.online.value === false" class="offline-banner" role="alert">
            <ServerStackIcon class="askowl-icon" />
            <span>
                Backend unreachable — requests to <code>/api</code> are failing. The AskOwl API
                (proxy target) is not responding.
            </span>
            <Button label="Retry" size="small" text @click="health.probe()" />
        </div>
    </div>
</template>

<style scoped>
.app-shell {
    display: flex;
    height: 100%;
}

.offline-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 1rem;
    background: var(--p-surface-950);
    color: var(--p-surface-0);
    font-size: 0.875rem;
}

.offline-banner code {
    font-size: 0.8125rem;
}

.mobile-bar {
    display: none;
}

.sidebar-pane {
    width: 17rem;
    flex-shrink: 0;
    height: 100%;
    border-right: 1px solid var(--p-content-border-color);
    background: var(--p-content-background);
    transition: width 0.18s ease;
}

.sidebar-pane.collapsed {
    width: 4rem;
}

.main-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.brand {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    text-decoration: none;
    color: var(--p-text-color);
    font-weight: 500;
}

@media (max-width: 900px) {
    .app-shell {
        flex-direction: column;
    }

    .mobile-bar {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        height: 3rem;
        padding: 0 0.5rem;
        border-bottom: 1px solid var(--p-content-border-color);
        flex-shrink: 0;
    }

    .sidebar-pane {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 1100;
        width: min(17rem, 85vw);
        transform: translateX(-105%);
        transition: transform 0.22s ease;
    }

    .sidebar-pane.collapsed {
        width: min(17rem, 85vw);
    }

    .app-shell.drawer-open .sidebar-pane {
        transform: translateX(0);
        box-shadow: var(--p-overlay-navigation-shadow);
    }

    .backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: var(--p-mask-background);
    }
}
</style>
