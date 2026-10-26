<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import {
    ExclamationCircleIcon,
    HeartIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/vue/24/outline";
import { ApiError } from "../../shared/api/http";
import { useAdminConnections } from "../../features/admin/useAdminConnections";
import type { Provider } from "../../entities/provider";

const toast = useToast();
const confirm = useConfirm();
const { providers, loading, probing, load, probe, create, update, remove } = useAdminConnections();

const dialogVisible = ref(false);
const editing = ref<Provider | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);

const form = ref({
  name: "",
  provider_type: "",
  base_url: "",
  api_key: "",
  clear_key: false,
  is_active: true,
});

onMounted(() => {
  load().catch((error: unknown) => {
    toast.add({
      severity: "error",
      summary: "Connections unavailable",
      detail: error instanceof ApiError ? error.message : "Could not load providers.",
      life: 6000,
    });
  });
});

function healthLightClass(status: string): string {
  if (status === "up") {
    return "up";
  }
  if (status === "down") {
    return "down";
  }
  if (status === "local") {
    return "local";
  }
  return "unknown";
}

function openCreate(): void {
  editing.value = null;
  form.value = { name: "", provider_type: "", base_url: "", api_key: "", clear_key: false, is_active: true };
  formError.value = null;
  dialogVisible.value = true;
}

function openEdit(provider: Provider): void {
  editing.value = provider;
  form.value = {
    name: provider.name,
    provider_type: provider.provider_type,
    base_url: provider.base_url ?? "",
    api_key: "",
    clear_key: false,
    is_active: provider.is_active,
  };
  formError.value = null;
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  const name = form.value.name.trim();
  if (name.length === 0) {
    formError.value = "Name is required.";
    return;
  }
  const providerType = form.value.provider_type.trim();
  if (providerType.length === 0) {
    formError.value = "Provider type is required (e.g. openai or ollama).";
    return;
  }
  const baseUrl = form.value.base_url.trim();
  const apiKey = form.value.api_key.trim();

  saving.value = true;
  formError.value = null;
  try {
    if (editing.value) {
      const payload: Record<string, unknown> = {
        name,
        provider_type: providerType,
        base_url: baseUrl.length > 0 ? baseUrl : null,
        is_active: form.value.is_active,
      };
      if (form.value.clear_key && editing.value.has_api_key) {
        payload.api_key = null;
      } else if (apiKey.length > 0) {
        payload.api_key = apiKey;
      }
      await update(editing.value.id, payload);
      toast.add({ severity: "success", summary: "Connection updated", life: 3000 });
    } else {
      await create({
        name,
        provider_type: providerType,
        base_url: baseUrl.length > 0 ? baseUrl : null,
        api_key: apiKey.length > 0 ? apiKey : null,
        is_active: form.value.is_active,
      });
      toast.add({ severity: "success", summary: "Connection created", life: 3000 });
    }
    dialogVisible.value = false;
  } catch (error: unknown) {
    formError.value = error instanceof ApiError ? error.message : "Unexpected error.";
  } finally {
    saving.value = false;
  }
}

async function probeNow(): Promise<void> {
  try {
    await probe();
    toast.add({ severity: "success", summary: "Health re-probed", detail: "All providers re-checked.", life: 3000 });
  } catch (error: unknown) {
    toast.add({
      severity: "error",
      summary: "Probe failed",
      detail: error instanceof ApiError ? error.message : "Unexpected error.",
      life: 6000,
    });
  }
}

function askDelete(provider: Provider): void {
  confirm.require({
    message: `Delete connection "${provider.name}"? Its model entries become orphaned and stop resolving.`,
    header: "Delete connection",
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    accept: async () => {
      try {
        await remove(provider.id);
        toast.add({ severity: "success", summary: "Connection deleted", life: 3000 });
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
</script>

<template>
    <div class="connection-manager">
        <div class="panel-head">
            <p class="panel-hint">
                Connections are the model backends the pipeline talks to (cloud APIs, LAN hosts,
                in-process services). API keys are stored encrypted and never returned.
            </p>
            <div class="head-actions">
                <Button
                    label="Check health"
                    text
                    size="small"
                    :loading="probing"
                    @click="probeNow()"
                >
                    <template #icon><HeartIcon class="askowl-icon" /></template>
                    <template #loadingicon><HeartIcon class="askowl-icon spin" /></template>
                </Button>
                <Button label="New connection" size="small" @click="openCreate()">
                    <template #icon><PlusIcon class="askowl-icon" /></template>
                </Button>
            </div>
        </div>

        <div v-if="loading" class="table-skeleton">
            <div v-for="i in 3" :key="i" class="skeleton-row">
                <Skeleton height="1.25rem" width="25%" />
                <Skeleton height="1.25rem" width="35%" />
                <Skeleton height="1.25rem" width="20%" />
            </div>
        </div>
        <DataTable v-else :value="providers" data-key="id">
            <template #empty>
                <span class="empty-note">No connections yet. Add one before registering models.</span>
            </template>
            <Column field="name" header="Name" style="width: 26%" />
            <Column field="provider_type" header="Type" style="width: 14%">
                <template #body="{ data }">
                    <Tag :value="data.provider_type" severity="info" rounded />
                </template>
            </Column>
            <Column header="Health" style="width: 12%">
                <template #body="{ data }">
                    <span
                        class="health-light"
                        :class="healthLightClass(data.health_status)"
                        :title="`Health: ${data.health_status}`"
                    ></span>
                </template>
            </Column>
            <Column header="Status" style="width: 12%">
                <template #body="{ data }">
                    <Tag :value="data.is_active ? 'active' : 'inactive'" :severity="data.is_active ? 'success' : 'secondary'" rounded />
                </template>
            </Column>
            <Column header="Actions" style="width: 7rem">
                <template #body="{ data }">
                    <div class="row-actions">
                        <Button text rounded size="small" aria-label="Edit connection" @click="openEdit(data)">
                            <template #icon><PencilIcon class="askowl-icon" /></template>
                        </Button>
                        <Button text rounded severity="danger" size="small" aria-label="Delete connection" @click="askDelete(data)">
                            <template #icon><TrashIcon class="askowl-icon" /></template>
                        </Button>
                    </div>
                </template>
            </Column>
        </DataTable>

        <Dialog
            v-model:visible="dialogVisible"
            modal
            :header="editing ? 'Edit connection' : 'New connection'"
            :style="{ width: '32rem', maxWidth: '95vw' }"
        >
            <div class="dialog-body">
                <div class="field">
                    <label for="conn-name">Name</label>
                    <InputText id="conn-name" v-model="form.name" maxlength="100" fluid placeholder="openrouter" />
                </div>

                <div class="field">
                    <label for="conn-type">Provider type</label>
                    <InputText id="conn-type" v-model="form.provider_type" fluid placeholder="openai / ollama" />
                    <small class="field-hint">
                        How the backend talks to it — "openai" for OpenAI-compatible APIs, "ollama" for local Ollama.
                    </small>
                </div>

                <div class="field">
                    <label for="conn-url">Base URL (optional)</label>
                    <InputText id="conn-url" v-model="form.base_url" fluid placeholder="https://openrouter.ai/api/v1" />
                    <small class="field-hint">Empty means in-process — no HTTP endpoint.</small>
                </div>

                <div v-if="!editing || editing.has_api_key" class="field">
                    <label for="conn-key">Stored API key</label>
                    <div class="key-state">
                        <code v-if="editing?.has_api_key" class="key-note">a key is stored (never readable)</code>
                        <Checkbox
                            v-if="editing?.has_api_key"
                            v-model="form.clear_key"
                            input-id="conn-key-clear"
                            binary
                        />
                        <label v-if="editing?.has_api_key" for="conn-key-clear">Remove stored key</label>
                    </div>
                </div>

                <div class="field">
                    <label for="conn-key-new">{{ editing?.has_api_key ? "Replace API key" : "API key (optional)" }}</label>
                    <InputText
                        id="conn-key-new"
                        v-model="form.api_key"
                        type="password"
                        fluid
                        placeholder="sk-…"
                        autocomplete="off"
                    />
                </div>

                <div class="field-row">
                    <Checkbox v-model="form.is_active" input-id="conn-active" binary />
                    <label for="conn-active">Active</label>
                </div>

                <Message v-if="formError" severity="error">
                    <template #icon><ExclamationCircleIcon class="askowl-icon" /></template>
                    {{ formError }}
                </Message>
            </div>

            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="dialogVisible = false" />
                <Button :label="editing ? 'Save changes' : 'Create connection'" :loading="saving" @click="save()" />
            </template>
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

.head-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.panel-hint {
    margin: 0;
    color: var(--p-text-muted-color);
    font-size: 0.875rem;
}

.empty-note {
    color: var(--p-text-muted-color);
}

.health-light {
    display: inline-block;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 9999px;
    background: var(--p-surface-300);
    vertical-align: middle;
}

.health-light.up {
    background: var(--askowl-lime);
}

.health-light.down {
    background: var(--askowl-red);
}

.health-light.local {
    background: var(--p-surface-500);
}

.row-actions {
    display: flex;
    gap: 0.25rem;
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

.field-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.field-row label {
    font-size: 0.8125rem;
}

.key-state {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.key-note {
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
}
</style>
