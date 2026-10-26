<script setup lang="ts">
import Button from "primevue/button";
import { MoonIcon, SunIcon } from "@heroicons/vue/24/outline";
import AppLogo from "../AppLogo.vue";
import { useTheme } from "../../shared/theme/theme";

const { mode, toggle } = useTheme();
</script>

<template>
    <div class="auth-layout">
        <Button
            class="theme-toggle"
            text
            rounded
            severity="secondary"
            :aria-label="mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
            @click="toggle()"
        >
            <template #icon>
                <SunIcon v-if="mode === 'dark'" class="askowl-icon" />
                <MoonIcon v-else class="askowl-icon" />
            </template>
        </Button>
        <div class="auth-column">
            <div class="brand">
                <span class="brand-tile">
                    <AppLogo :size="34" />
                </span>
                <h1 class="brand-name">AskOwl</h1>
                <p class="brand-tagline">
                    Search the web, rank what matters, and get answers with citations.
                </p>
            </div>
            <div class="auth-card">
                <RouterView />
            </div>
        </div>
    </div>
</template>

<style scoped>
.auth-layout {
    position: relative;
    height: 100%;
    overflow-y: auto;
    display: flex;
    justify-content: center;
    padding: 2rem 1.25rem;
}

.auth-column {
    width: min(24rem, 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 1.5rem;
}

.brand-tile {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 9999px;
    background: var(--p-surface-400);
    color: var(--p-text-color);
}

.brand-name {
    margin: 0.75rem 0 0.25rem;
    font-size: 2rem;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: var(--p-text-color);
}

.brand-tagline {
    margin: 0;
    color: var(--p-text-muted-color);
    font-size: 0.875rem;
    line-height: 1.5;
}

.auth-card {
    padding: 1.75rem;
    background: var(--p-card-background);
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
}

.theme-toggle {
    position: absolute;
    top: 1rem;
    right: 1rem;
}
</style>
