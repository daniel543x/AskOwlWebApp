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
import type { RegisterForm } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const form = ref<RegisterForm>({ email: "", nickname: "", password: "", confirmPassword: "" });
const loading = ref(false);
const error = ref<string | null>(null);
const fieldErrors = ref<{ email?: string; nickname?: string; password?: string; confirmPassword?: string }>({});

function validate(): boolean {
  const errors: typeof fieldErrors.value = {};

  if (!form.value.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(form.value.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.value.nickname.trim()) {
    errors.nickname = "Nickname is required.";
  } else if (form.value.nickname.trim().length > 50) {
    errors.nickname = "Nickname must be at most 50 characters.";
  }

  if (!form.value.password) {
    errors.password = "Password is required.";
  }

  if (form.value.confirmPassword !== form.value.password || !form.value.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function submit(): Promise<void> {
  if (loading.value || !validate()) {
    return;
  }
  error.value = null;
  loading.value = true;
  try {
    await auth.register({
      email: form.value.email.trim(),
      nickname: form.value.nickname.trim(),
      password: form.value.password,
    });
    await router.push({ name: "chat" });
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 400) {
      const message = cause.message.toLowerCase();
      if (message.includes("email")) {
        fieldErrors.value = { ...fieldErrors.value, email: cause.message };
      } else if (message.includes("nickname")) {
        fieldErrors.value = { ...fieldErrors.value, nickname: cause.message };
      } else {
        error.value = cause.message;
      }
    } else {
      const detail =
        cause instanceof ApiError ? cause.message : "Unexpected error — please try again.";
      toast.add({ severity: "error", summary: "Registration failed", detail, life: 6000 });
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
    <div class="register-form">
        <h2 class="title">Create your account</h2>
        <p class="subtitle">A private search companion of your own.</p>

        <form novalidate @submit.prevent="submit">
            <div class="field">
                <label for="email">Email</label>
                <InputText
                    id="email"
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    :disabled="loading"
                    :invalid="Boolean(fieldErrors.email)"
                />
                <small v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</small>
            </div>

            <div class="field">
                <label for="nickname">Nickname</label>
                <InputText
                    id="nickname"
                    v-model="form.nickname"
                    autocomplete="username"
                    maxlength="50"
                    :disabled="loading"
                    :invalid="Boolean(fieldErrors.nickname)"
                />
                <small v-if="fieldErrors.nickname" class="field-error">{{ fieldErrors.nickname }}</small>
            </div>

            <div class="field">
                <label for="password">Password</label>
                <Password
                    input-id="password"
                    v-model="form.password"
                    :feedback="false"
                    toggle-mask
                    autocomplete="new-password"
                    :disabled="loading"
                    :invalid="Boolean(fieldErrors.password)"
                    fluid
                />
                <small v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</small>
            </div>

            <div class="field">
                <label for="confirm-password">Confirm password</label>
                <Password
                    input-id="confirm-password"
                    v-model="form.confirmPassword"
                    :feedback="false"
                    toggle-mask
                    autocomplete="new-password"
                    :disabled="loading"
                    :invalid="Boolean(fieldErrors.confirmPassword)"
                    fluid
                />
                <small v-if="fieldErrors.confirmPassword" class="field-error">{{ fieldErrors.confirmPassword }}</small>
            </div>

            <Message v-if="error" severity="error" class="form-error">
                <template #icon><ExclamationCircleIcon class="askowl-icon" /></template>
                {{ error }}
            </Message>

            <Button
                type="submit"
                label="Create account"
                class="submit"
                :loading="loading"
                fluid
            />
        </form>

        <p class="switch">
            Already have an account?
            <RouterLink :to="{ name: 'login' }">Sign in</RouterLink>
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

.field-error {
    color: var(--p-message-error-color);
    font-size: 0.8125rem;
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
</style>
