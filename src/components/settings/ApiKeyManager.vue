<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import MultiSelect from "primevue/multiselect";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import {
    CheckIcon,
    ClipboardDocumentIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/vue/24/outline";
import { ApiError } from "../../shared/api/http";
import { formatRelativeTime } from "../../shared/utils/relativeTime";
import { useApiKeys } from "../../features/settings/useApiKeys";
import { API_KEY_SCOPES, type ApiKeyCreated, type ApiKeyScope } from "../../entities/apiKey";

const toast = useToast();
const confirm = useConfirm();
const { keys, loading, load, create, remove } = useApiKeys();

const createVisible = ref(false);
const saving = ref(false);
const formError = ref<string | null>(null);
const form = ref<{ name: string; scopes: ApiKeyScope[]; expiresAt: Date | null }>({
  name: "",
  scopes: ["search"],
  expiresAt: null,
});

const created = ref<ApiKeyCreated | null>(null);
const createdVisible = ref(false);
const copied = ref(false);

onMounted(() => {
  load().catch((error: unknown) => {
    toast.add({
      severity: "error",
      summary: "API keys unavailable",
      detail: error instanceof ApiError ? error.message : "Could not load API keys.",
      life: 6000,
    });
  });
});

function isExpired(key: { expires_at: string | null }): boolean {
  return key.expires_at !== null && new Date(key.expires_at).getTime() < Date.now();
}

function keyStatus(key: { is_active: boolean; expires_at: string | null }): {
  label: string;
  severity: "success" | "warn" | "danger" | "secondary";
} {
  if (!key.is_active) {
    return { label: "revoked", severity: "secondary" };
  }
  if (isExpired(key)) {
    return { label: "expired", severity: "warn" };
  }
  return { label: "active", severity: "success" };
}

function openCreate(): void {
  form.value = { name: "", scopes: ["search"], expiresAt: null };
  formError.value = null;
  createVisible.value = true;
}

async function submitCreate(): Promise<void> {
  const name = form.value.name.trim();
  if (name.length === 0) {
    formError.value = "Name is required.";
    return;
  }
  if (name.length > 100) {
    formError.value = "Name must be at most 100 characters.";
    return;
  }
  if (form.value.scopes.length === 0) {
    formError.value = "Pick at least one scope.";
    return;
  }

  saving.value = true;
  formError.value = null;
  try {
    const createdKey = await create({
      name,
      scopes: form.value.scopes,
      expires_at: form.value.expiresAt ? form.value.expiresAt.toISOString() : null,
    });
    createVisible.value = false;
    created.value = createdKey;
    createdVisible.value = true;
    copied.value = false;
  } catch (error: unknown) {
    formError.value = error instanceof ApiError ? error.message : "Unexpected error.";
  } finally {
    saving.value = false;
  }
}

async function copyRawKey(): Promise<void> {
  if (!created.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(created.value.raw_key);
    copied.value = true;
    toast.add({ severity: "success", summary: "Key copied to clipboard", life: 3000 });
  } catch {
    toast.add({
      severity: "warn",
      summary: "Copy failed",
      detail: "Select and copy the key manually.",
      life: 6000,
    });
  }
}

function askDelete(key: { id: string; name: string }): void {
  confirm.require({
    message: `Revoke API key "${key.name}"? Clients using it stop working immediately; the entry stays listed as revoked.`,
    header: "Revoke API key",
    acceptLabel: "Revoke",
    rejectLabel: "Cancel",
    accept: async () => {
      try {
        await remove(key.id);
        toast.add({ severity: "success", summary: "Key revoked", life: 3000 });
      } catch (error: unknown) {
        toast.add({
          severity: "error",
          summary: "Revoke failed",
          detail: error instanceof ApiError ? error.message : "Unexpected error.",
          life: 6000,
        });
      }
    },
  });
}
</script>

<template>
    <div class="api-key-manager">
        <div class="panel-head">
            <p class="panel-hint">
                API keys authenticate other clients (scripts, backends) against the AskOwl API.
                They are shown only once at creation.
            </p>
            <Button label="Create key" size="small" @click="openCreate()">
                <template #icon><PlusIcon class="askowl-icon" /></template>
            </Button>
        </div>

        <div v-if="loading" class="table-skeleton">
            <div v-for="i in 3" :key="i" class="skeleton-row">
                <Skeleton height="1.25rem" width="30%" />
                <Skeleton height="1.25rem" width="45%" />
                <Skeleton height="1.25rem" width="15%" />
            </div>
        </div>
        <DataTable v-else :value="keys" data-key="id">
            <template #empty>
                <span class="empty-note">No API keys yet.</span>
            </template>
            <Column field="name" header="Name" style="width: 22%" />
            <Column header="Key" style="width: 14%">
                <template #body="{ data }">
                    <code class="key-prefix">{{ data.key_prefix }}…</code>
                </template>
            </Column>
            <Column header="Scopes" style="min-width: 18%">
                <template #body="{ data }">
                    <div class="scope-tags">
                        <Tag v-for="scope in data.scopes" :key="scope" :value="scope" severity="info" rounded />
                    </div>
                </template>
            </Column>
            <Column header="Status" style="width: 12%">
                <template #body="{ data }">
                    <Tag :severity="keyStatus(data).severity" rounded>
                        <span class="status-dot" :class="keyStatus(data).label"></span>
                        {{ keyStatus(data).label }}
                    </Tag>
                </template>
            </Column>
            <Column header="Expires" style="width: 14%">
                <template #body="{ data }">
                    {{ data.expires_at ? new Date(data.expires_at).toLocaleDateString() : "Never" }}
                </template>
            </Column>
            <Column header="Last used" style="width: 14%">
                <template #body="{ data }">
                    {{ data.last_used_at ? formatRelativeTime(data.last_used_at) : "Never" }}
                </template>
            </Column>
            <Column header="Actions" style="width: 5rem">
                <template #body="{ data }">
                    <Button
                        text
                        rounded
                        severity="danger"
                        size="small"
                        aria-label="Revoke key"
                        @click="askDelete(data)"
                    >
                        <template #icon><TrashIcon class="askowl-icon" /></template>
                    </Button>
                </template>
            </Column>
        </DataTable>

        <Dialog
            v-model:visible="createVisible"
            modal
            header="Create API key"
            :style="{ width: '26rem', maxWidth: '95vw' }"
        >
            <div class="dialog-body">
                <div class="field">
                    <label for="key-name">Name</label>
                    <InputText id="key-name" v-model="form.name" maxlength="100" fluid placeholder="ci-pipeline" />
                </div>
                <div class="field">
                    <label>Scopes</label>
                    <MultiSelect
                        v-model="form.scopes"
                        :options="API_KEY_SCOPES"
                        fluid
                        placeholder="Scopes"
                    />
                    <small class="field-hint">
                        Elevated modes additionally require the research role on your account.
                    </small>
                </div>
                <div class="field">
                    <label for="key-expiry">Expiry (optional)</label>
                    <DatePicker id="key-expiry" v-model="form.expiresAt" show-icon fluid date-format="yy-mm-dd" />
                </div>
                <Message v-if="formError" severity="error">
                    <template #icon><ExclamationCircleIcon class="askowl-icon" /></template>
                    {{ formError }}
                </Message>
            </div>
            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="createVisible = false" />
                <Button label="Create key" :loading="saving" @click="submitCreate()" />
            </template>
        </Dialog>

        <Dialog
            v-model:visible="createdVisible"
            modal
            header="Your new API key"
            :closable="true"
            :style="{ width: '30rem', maxWidth: '95vw' }"
            @hide="created = null"
        >
            <div v-if="created" class="created-body">
                <Message severity="warn" :pt="{ text: { style: { textAlign: 'left' } } }">
                    <template #icon><ExclamationTriangleIcon class="askowl-icon" /></template>
                    <strong>Copy it now — this is the only time the full key is shown.</strong>
                </Message>
                <div class="raw-key-row">
                    <code class="raw-key">{{ created.raw_key }}</code>
                    <Button
                        :severity="copied ? 'success' : 'primary'"
                        rounded
                        aria-label="Copy key"
                        @click="copyRawKey()"
                    >
                        <template #icon>
                            <CheckIcon v-if="copied" class="askowl-icon" />
                            <ClipboardDocumentIcon v-else class="askowl-icon" />
                        </template>
                    </Button>
                </div>
                <p class="created-hint">
                    Only the prefix <code>{{ created.key_prefix }}…</code> is stored in plain sight;
                    the key itself cannot be retrieved later.
                </p>
            </div>
        </Dialog>
    </div>
</template>

<style scoped>
.panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
}

@media (max-width: 640px) {
    .panel-head {
        flex-direction: column;
        align-items: stretch;
    }
}

.panel-hint {
    margin: 0;
    color: var(--p-text-muted-color);
    font-size: 0.875rem;
}

.empty-note {
    color: var(--p-text-muted-color);
}

.key-prefix {
    font-size: 0.8125rem;
    background: color-mix(in oklab, var(--p-text-color) 8%, transparent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.375rem;
}

.scope-tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
}

.status-dot {
    width: 0.375rem;
    height: 0.375rem;
    flex-shrink: 0;
    border-radius: 9999px;
    background: var(--p-text-muted-color);
}

.status-dot.active {
    background: var(--askowl-lime);
}

.status-dot.revoked {
    background: transparent;
    border: 1px solid var(--p-text-muted-color);
}

.table-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.skeleton-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.dialog-body {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding-top: 0.25rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.field label {
    font-size: 0.8125rem;
    font-weight: 500;
}

.field-hint {
    color: var(--p-text-muted-color);
    font-size: 0.75rem;
}

.created-body {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}

.raw-key-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.raw-key {
    flex: 1;
    overflow-wrap: anywhere;
    font-size: 0.8125rem;
    background: color-mix(in oklab, var(--p-text-color) 8%, transparent);
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
}

.created-hint {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--p-text-muted-color);
}
</style>
