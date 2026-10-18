<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import AppSidebar from "./AppSidebar.vue";
import AppLogo from "../AppLogo.vue";
import { useHealth } from "../../features/health/useHealth";

const route = useRoute();
const drawerOpen = ref(false);
const health = useHealth();

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
                icon="pi pi-bars"
                text
                rounded
                severity="secondary"
                aria-label="Open menu"
                @click="drawerOpen = true"
            />
            <RouterLink class="brand" :to="{ name: 'chat' }">
                <AppLogo :size="22" />
                <span>AskOwl</span>
            </RouterLink>
        </header>

        <aside class="sidebar-pane">
            <AppSidebar in-drawer @navigate="drawerOpen = false" />
        </aside>

        <div v-if="drawerOpen" class="backdrop" @click="drawerOpen = false"></div>

        <main class="main-pane">
            <RouterView />
        </main>

        <ConfirmDialog />

        <div v-if="health.online.value === false" class="offline-banner" role="alert">
            <i class="pi pi-server"></i>
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
    background: var(--p-message-warn-background);
    color: var(--p-message-warn-color);
    border-bottom: 1px solid color-mix(in oklab, var(--p-message-warn-color) 35%, transparent);
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
    color: var(--p-primary-color);
    font-weight: 700;
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
