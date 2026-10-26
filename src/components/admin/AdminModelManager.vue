<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputChips from "primevue/inputchips";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import {
    ExclamationCircleIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/vue/24/outline";
import { ApiError } from "../../shared/api/http";
import { MODEL_KINDS, type ModelEntry, type ModelKind } from "../../entities/models";
import { useAdminConnections } from "../../features/admin/useAdminConnections";
import { useAdminModels } from "../../features/admin/useAdminModels";

const toast = useToast();
const confirm = useConfirm();
const { entries, loading, load, create, update, remove } = useAdminModels();
const connections = useAdminConnections();

const ROLES = ["user", "research", "admin"] as const;

const KIND_LABELS: Record<ModelKind, string> = {
  chat: "Chat models",
  embedding: "Embedding models",
  reranker: "Reranker models",
  decision: "Decision models",
};

const kindsWithEntries = computed(() =>
  MODEL_KINDS.filter((kind) => entries.value.some((entry) => entry.kind === kind)),
);

function entriesFor(kind: ModelKind): ModelEntry[] {
  return entries.value.filter((entry) => entry.kind === kind);
}

const dialogVisible = ref(false);
const editing = ref<ModelEntry | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);

const form = ref({
  provider_id: "",
  kind: "chat" as ModelKind,
  model_name: "",
  display_name: "",
  required_role: "user",
  capabilities: [] as string[],
  vector_dims: null as number | null,
  default_params: "{}",
  is_active: true,
});

onMounted(() => {
  load().catch((error: unknown) => {
    toast.add({
      severity: "error",
      summary: "Model entries unavailable",
      detail: error instanceof ApiError ? error.message : "Could not load model entries.",
      life: 6000,
    });
  });
  connections.load().catch(() => {
    // the entry dialog falls back to provider names from the loaded entries
  });
});

const providerOptions = computed(() => {
  if (connections.providers.value.length > 0) {
    return connections.providers.value.map((provider) => ({
      id: provider.id,
      label: `${provider.name} (${provider.provider_type})`,
    }));
  }
  return [...new Set(entries.value.map((entry) => entry.provider_id))].map((id) => ({ id, label: id }));
});

function labelFor(entry: ModelEntry): string {
  return entry.display_name || entry.model_name;
}

function openCreate(): void {
  editing.value = null;
  form.value = {
    provider_id: "",
    kind: "chat",
    model_name: "",
    display_name: "",
    required_role: "user",
    capabilities: [],
    vector_dims: null,
    default_params: "{}",
    is_active: true,
  };
  formError.value = null;
  dialogVisible.value = true;
}

function openEdit(entry: ModelEntry): void {
  editing.value = entry;
  form.value = {
    provider_id: entry.provider_id,
    kind: entry.kind,
    model_name: entry.model_name,
    display_name: entry.display_name,
    required_role: entry.required_role,
    capabilities: [...entry.capabilities],
    vector_dims: entry.vector_dims,
    default_params: "{}",
    is_active: entry.is_active,
  };
  formError.value = null;
  dialogVisible.value = true;
}

async function save(): Promise<void> {
  const modelName = form.value.model_name.trim();
  if (modelName.length === 0) {
    formError.value = "Model identifier is required.";
    return;
  }
  if (!editing.value && form.value.provider_id.length === 0) {
    formError.value = "Pick the connection this model runs on.";
    return;
  }

  let defaultParams: Record<string, unknown> | null = null;
  const raw = form.value.default_params.trim();
  if (raw.length > 0) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        formError.value = "Default parameters must be a JSON object.";
        return;
      }
      defaultParams = parsed as Record<string, unknown>;
    } catch {
      formError.value = "Default parameters must be valid JSON.";
      return;
    }
  }

  saving.value = true;
  formError.value = null;
  try {
    if (editing.value) {
      await update(editing.value.id, {
        model_name: modelName,
        display_name: form.value.display_name.trim(),
        required_role: form.value.required_role,
        capabilities: form.value.capabilities,
        vector_dims: form.value.vector_dims,
        is_active: form.value.is_active,
        ...(defaultParams !== null ? { default_params: defaultParams } : {}),
      });
      toast.add({ severity: "success", summary: "Model updated", life: 3000 });
    } else {
      await create({
        provider_id: form.value.provider_id,
        kind: form.value.kind,
        model_name: modelName,
        display_name: form.value.display_name.trim(),
        required_role: form.value.required_role,
        capabilities: form.value.capabilities,
        vector_dims: form.value.vector_dims,
        is_active: form.value.is_active,
        default_params: defaultParams ?? {},
      });
      toast.add({ severity: "success", summary: "Model registered", life: 3000 });
    }
    dialogVisible.value = false;
  } catch (error: unknown) {
    formError.value = error instanceof ApiError ? error.message : "Unexpected error.";
  } finally {
    saving.value = false;
  }
}

function askDelete(entry: ModelEntry): void {
  confirm.require({
    message: `Delete model "${labelFor(entry)}"? Users selecting it fall back to the global default.`,
    header: "Delete model entry",
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    accept: async () => {
      try {
        await remove(entry.id);
        toast.add({ severity: "success", summary: "Model deleted", life: 3000 });
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
    <div class="model-manager">
        <div class="panel-head">
            <p class="panel-hint">
                Model entries connect a concrete model to a connection. Chat models need the
                "tools" capability for the ask pipeline.
            </p>
            <Button label="New model" size="small" @click="openCreate()">
                <template #icon><PlusIcon class="askowl-icon" /></template>
            </Button>
        </div>

        <div v-if="loading" class="table-skeleton">
            <div v-for="i in 3" :key="i" class="skeleton-row">
                <Skeleton height="1.25rem" width="30%" />
                <Skeleton height="1.25rem" width="35%" />
                <Skeleton height="1.25rem" width="15%" />
            </div>
        </div>
        <template v-else-if="kindsWithEntries.length > 0">
            <section v-for="kind in kindsWithEntries" :key="kind" class="kind-group">
                <h2 class="kind-title">{{ KIND_LABELS[kind] }}</h2>
                <DataTable :value="entriesFor(kind)" data-key="id">
                    <Column header="Model" style="width: 30%">
                        <template #body="{ data }">
                            <div class="model-cell">
                                <span class="model-name">{{ labelFor(data) }}</span>
                                <code class="model-id">{{ data.model_name }}</code>
                            </div>
                        </template>
                    </Column>
                    <Column header="Connection" style="width: 18%">
                        <template #body="{ data }">
                            {{ data.provider_name ?? data.provider_id }}
                        </template>
                    </Column>
                    <Column header="Role" style="width: 10%">
                        <template #body="{ data }">
                            {{ data.required_role }}
                        </template>
                    </Column>
                    <Column header="Capabilities" style="min-width: 18%">
                        <template #body="{ data }">
                            <div class="cap-tags">
                                <Tag v-for="capability in data.capabilities" :key="capability" :value="capability" severity="secondary" rounded />
                            </div>
                        </template>
                    </Column>
                    <Column header="Status" style="width: 10%">
                        <template #body="{ data }">
                            <Tag :value="data.is_active ? 'active' : 'inactive'" :severity="data.is_active ? 'success' : 'secondary'" rounded />
                        </template>
                    </Column>
                    <Column header="Actions" style="width: 7rem">
                        <template #body="{ data }">
                            <div class="row-actions">
                                <Button text rounded size="small" aria-label="Edit model" @click="openEdit(data)">
                                    <template #icon><PencilIcon class="askowl-icon" /></template>
                                </Button>
                                <Button text rounded severity="danger" size="small" aria-label="Delete model" @click="askDelete(data)">
                                    <template #icon><TrashIcon class="askowl-icon" /></template>
                                </Button>
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </section>
        </template>
        <p v-else class="empty-note">No models registered yet.</p>

        <Dialog
            v-model:visible="dialogVisible"
            modal
            :header="editing ? 'Edit model' : 'New model'"
            :style="{ width: '34rem', maxWidth: '95vw' }"
        >
            <div class="dialog-body">
                <div class="field">
                    <label for="entry-provider">Connection</label>
                    <Select
                        id="entry-provider"
                        v-model="form.provider_id"
                        :options="providerOptions"
                        option-label="label"
                        option-value="id"
                        :disabled="editing !== null"
                        fluid
                        placeholder="Select a connection"
                    />
                    <small v-if="editing" class="field-hint">The connection of an existing entry cannot change.</small>
                </div>

                <div class="field-row">
                    <div class="field">
                        <label for="entry-kind">Kind</label>
                        <Select
                            id="entry-kind"
                            v-model="form.kind"
                            :options="MODEL_KINDS"
                            :disabled="editing !== null"
                            fluid
                        />
                    </div>
                    <div class="field">
                        <label for="entry-role">Required role</label>
                        <Select id="entry-role" v-model="form.required_role" :options="[...ROLES]" fluid />
                    </div>
                </div>

                <div class="field-row">
                    <div class="field">
                        <label for="entry-model-name">Model identifier</label>
                        <InputText id="entry-model-name" v-model="form.model_name" fluid placeholder="qwen3.5" />
                    </div>
                    <div class="field">
                        <label for="entry-display">Display name (optional)</label>
                        <InputText id="entry-display" v-model="form.display_name" fluid placeholder="Qwen 3.5 (local)" />
                    </div>
                </div>

                <div class="field">
                    <label>Capabilities</label>
                    <InputChips v-model="form.capabilities" fluid separator="," placeholder="tools, embedding" />
                </div>

                <div class="field-row">
                    <div class="field">
                        <label for="entry-vector-dims">Vector dims (embedding models)</label>
                        <InputNumber id="entry-vector-dims" v-model="form.vector_dims" fluid :use-grouping="false" placeholder="1024" />
                    </div>
                    <div class="field row-center">
                        <Checkbox v-model="form.is_active" input-id="entry-active" binary />
                        <label for="entry-active">Active</label>
                    </div>
                </div>

                <div class="field">
                    <label for="entry-params">Default provider parameters (JSON, optional)</label>
                    <Textarea id="entry-params" v-model="form.default_params" rows="3" fluid class="mono" placeholder='{"temperature": 0.2}' />
                    <small v-if="editing" class="field-hint">Leave empty to keep the stored parameters on this entry.</small>
                </div>

                <Message v-if="formError" severity="error">
                    <template #icon><ExclamationCircleIcon class="askowl-icon" /></template>
                    {{ formError }}
                </Message>
            </div>

            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="dialogVisible = false" />
                <Button :label="editing ? 'Save changes' : 'Register model'" :loading="saving" @click="save()" />
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

.panel-hint {
    margin: 0;
    color: var(--p-text-muted-color);
    font-size: 0.875rem;
}

.empty-note {
    color: var(--p-text-muted-color);
}

.kind-group {
    margin-top: 1.25rem;
}

.kind-group:first-of-type {
    margin-top: 0.25rem;
}

.kind-title {
    margin: 0 0 0.5rem;
    font-size: 0.9375rem;
    font-weight: 500;
}

.model-cell {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.model-name {
    font-weight: 500;
}

.model-id {
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
    word-break: break-all;
}

.cap-tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
}

@media (max-width: 480px) {
    .field-row {
        grid-template-columns: 1fr;
    }
}

.row-center {
    justify-content: flex-end;
    gap: 0.5rem;
    flex-direction: row;
    align-items: center;
}

.row-center label {
    font-weight: 400;
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
