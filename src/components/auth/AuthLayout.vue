<script setup lang="ts">
import Button from "primevue/button";
import AppLogo from "../AppLogo.vue";
import { useTheme } from "../../shared/theme/theme";

const { mode, toggle } = useTheme();
</script>

<template>
    <div class="auth-layout">
        <aside class="brand-panel">
            <div class="brand">
                <AppLogo :size="64" />
                <h1 class="brand-name">AskOwl</h1>
                <p class="brand-tagline">
                    Search the web, rank what matters, and get answers with citations.
                </p>
            </div>
        </aside>
        <main class="form-panel">
            <Button
                class="theme-toggle"
                :icon="mode === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"
                text
                rounded
                severity="secondary"
                :aria-label="mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                @click="toggle()"
            />
            <div class="auth-card">
                <RouterView />
            </div>
        </main>
    </div>
</template>

<style scoped>
.auth-layout {
    display: flex;
    height: 100%;
}

.brand-panel {
    flex: 1 1 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in oklab, var(--p-primary-color) 10%, var(--p-content-background));
    border-right: 1px solid var(--p-content-border-color);
}

.brand {
    max-width: 26rem;
    padding: 2rem;
    color: var(--p-text-color);
}

.brand-name {
    margin: 1rem 0 0.5rem;
    font-size: 2.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
}

.brand :deep(svg) {
    color: var(--p-primary-color);
}

.brand-tagline {
    margin: 0;
    color: var(--p-text-muted-color);
    font-size: 1.05rem;
    line-height: 1.5;
}

.form-panel {
    flex: 1 1 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.25rem;
}

.theme-toggle {
    position: absolute;
    top: 1rem;
    right: 1rem;
}

.auth-card {
    width: min(24rem, 100%);
    padding: 2rem;
    background: var(--p-content-background);
    border: 1px solid var(--p-content-border-color);
    border-radius: 1rem;
}

@media (max-width: 880px) {
    .auth-layout {
        flex-direction: column;
    }

    .brand-panel {
        border-right: none;
        border-bottom: 1px solid var(--p-content-border-color);
        padding: 1.5rem 1rem;
    }

    .brand {
        text-align: center;
        padding: 0;
    }

    .brand-name {
        font-size: 1.75rem;
    }

    .form-panel {
        align-items: flex-start;
        padding-top: 3.5rem;
    }
}
</style>
