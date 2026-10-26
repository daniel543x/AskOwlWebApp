<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Message from "primevue/message";
import { useToast } from "primevue/usetoast";
import { ExclamationCircleIcon } from "@heroicons/vue/24/outline";
import { useAuthStore } from "../../features/auth/authStore";
import { ApiError } from "../../shared/api/http";
import type { LoginForm } from "./types";

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const form = ref<LoginForm>({ identifier: "", password: "" });
const loading = ref(false);
const error = ref<string | null>(null);

async function submit(): Promise<void> {
  if (loading.value) {
    return;
  }
  error.value = null;
  loading.value = true;
  try {
    await auth.login(form.value.identifier.trim(), form.value.password);
    await router.push({ name: "chat" });
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 401) {
      error.value = "Invalid credentials. Check your identifier and password.";
    } else {
      const detail =
        cause instanceof ApiError ? cause.message : "Unexpected error — please try again.";
      toast.add({ severity: "error", summary: "Login failed", detail, life: 6000 });
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
    <div class="login-form">
        <h2 class="title">Welcome back</h2>
        <p class="subtitle">Sign in to continue to AskOwl.</p>

        <form novalidate @submit.prevent="submit">
            <div class="field">
                <label for="identifier">Email or nickname</label>
                <InputText
                    id="identifier"
                    v-model="form.identifier"
                    autocomplete="username"
                    :disabled="loading"
                    autofocus
                />
            </div>

            <div class="field">
                <label for="password">Password</label>
                <Password
                    input-id="password"
                    v-model="form.password"
                    :feedback="false"
                    toggle-mask
                    autocomplete="current-password"
                    :disabled="loading"
                    fluid
                />
            </div>

            <Message v-if="error" severity="error" class="form-error">
                <template #icon><ExclamationCircleIcon class="askowl-icon" /></template>
                {{ error }}
            </Message>

            <Button
                type="submit"
                label="Sign in"
                class="submit"
                :loading="loading"
                fluid
            />
        </form>

        <p class="switch">
            No account yet?
            <RouterLink :to="{ name: 'register' }">Create one</RouterLink>
        </p>
    </div>
</template>

<style scoped>
.title {
    margin: 0 0 0.25rem;
    font-size: 1.625rem;
    font-weight: 400;
    letter-spacing: -0.01em;
}

.subtitle {
    margin: 0 0 1.5rem;
    color: var(--p-text-muted-color);
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-bottom: 1rem;
}

.field label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--p-text-muted-color);
}

.form-error {
    margin-bottom: 1rem;
}

.submit {
    margin-top: 0.5rem;
}

.switch {
    margin: 1.25rem 0 0;
    text-align: center;
    font-size: 0.875rem;
    color: var(--p-text-muted-color);
}

.switch :deep(a) {
    color: var(--p-text-color);
}
</style>
