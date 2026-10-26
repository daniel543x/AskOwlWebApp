<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputChips from "primevue/inputchips";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Skeleton from "primevue/skeleton";
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
import { formatRelativeTime } from "../../shared/utils/relativeTime";
import { usePersonas } from "../../features/settings/usePersonas";
import type { PersonaRead } from "../../entities/persona";

const toast = useToast();
const confirm = useConfirm();
const { personas, loading, load, create, update, remove } = usePersonas();

const dialogVisible = ref(false);
const editing = ref<PersonaRead | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);

const form = ref({
  name: "",
  system_context: "",
  allowed_domains: [] as string[],
  allowed_engines: [] as string[],
  allowed_keywords: [] as string[],
  default_parameters: "{}",
});

onMounted(() => {
  load().catch((error: unknown) => {
    toast.add({
      severity: "error",
      summary: "Personas unavailable",
      detail: error instanceof ApiError ? error.message : "Could not load personas.",
      life: 6000,
    });
  });
});

function openCreate(): void {
  editing.value = null;
  form.value = {
    name: "",
    system_context: "",
    allowed_domains: [],
    allowed_engines: [],
    allowed_keywords: [],
    default_parameters: "{}",
  };
  formError.value = null;
  dialogVisible.value = true;
}

function openEdit(persona: PersonaRead): void {
  editing.value = persona;
  form.value = {
    name: persona.name,
    system_context: persona.system_context,
    allowed_domains: [...persona.allowed_domains],
    allowed_engines: [...persona.allowed_engines],
    allowed_keywords: [...persona.allowed_keywords],
    default_parameters: JSON.stringify(persona.default_parameters, null, 2),
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
  if (name.length > 100) {
    formError.value = "Name must be at most 100 characters.";
    return;
  }

  let defaultParameters: Record<string, unknown> = {};
  const raw = form.value.default_parameters.trim();
  if (raw.length > 0) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        formError.value = "Default parameters must be a JSON object.";
        return;
      }
      defaultParameters = parsed as Record<string, unknown>;
    } catch {
      formError.value = "Default parameters must be valid JSON.";
      return;
    }
  }

  saving.value = true;
  formError.value = null;
  const payload = {
    name,
    system_context: form.value.system_context,
    allowed_domains: form.value.allowed_domains,
    allowed_engines: form.value.allowed_engines,
    allowed_keywords: form.value.allowed_keywords,
    default_parameters: defaultParameters,
  };
  try {
    if (editing.value) {
      await update(editing.value.id, payload);
      toast.add({ severity: "success", summary: "Persona updated", life: 3000 });
    } else {
      await create(payload);
      toast.add({ severity: "success", summary: "Persona created", life: 3000 });
    }
    dialogVisible.value = false;
  } catch (error: unknown) {
    formError.value = error instanceof ApiError ? error.message : "Unexpected error.";
  } finally {
    saving.value = false;
  }
}

function askDelete(persona: PersonaRead): void {
  confirm.require({
    message: `Delete persona "${persona.name}"? Agents will no longer be able to use it.`,
    header: "Delete persona",
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    accept: async () => {
      try {
        await remove(persona.id);
        toast.add({ severity: "success", summary: "Persona deleted", life: 3000 });
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
    <div class="persona-manager">
        <div class="panel-head">
            <p class="panel-hint">
                Personas shape agent behavior: system context, allowed domains, engines and
                keywords, and lower runtime budgets.
            </p>
            <Button label="New persona" size="small" @click="openCreate()">
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
        <DataTable v-else :value="personas" data-key="id">
            <template #empty>
                <span class="empty-note">No personas yet. Create one to scope agent runs.</span>
            </template>
            <Column field="name" header="Name" style="width: 30%" />
            <Column header="Constraints" style="min-width: 30%">
                <template #body="{ data }">
                    <span class="constraints">
                        {{ data.allowed_domains.length + data.allowed_engines.length + data.allowed_keywords.length }}
                        rule(s)
                    </span>
                </template>
            </Column>
            <Column header="Updated" style="width: 20%">
                <template #body="{ data }">
                    {{ formatRelativeTime(data.updated_at ?? data.created_at) }}
                </template>
            </Column>
            <Column header="Actions" style="width: 12rem">
                <template #body="{ data }">
                    <div class="row-actions">
                        <Button text rounded size="small" aria-label="Edit persona" @click="openEdit(data)">
                            <template #icon><PencilIcon class="askowl-icon" /></template>
                        </Button>
                        <Button text rounded severity="danger" size="small" aria-label="Delete persona" @click="askDelete(data)">
                            <template #icon><TrashIcon class="askowl-icon" /></template>
                        </Button>
                    </div>
                </template>
            </Column>
        </DataTable>

        <Dialog
            v-model:visible="dialogVisible"
            modal
            :header="editing ? 'Edit persona' : 'New persona'"
            :style="{ width: '34rem', maxWidth: '95vw' }"
        >
            <div class="dialog-body">
                <div class="field">
                    <label for="persona-name">Name</label>
                    <InputText id="persona-name" v-model="form.name" maxlength="100" fluid />
                </div>

                <div class="field">
                    <label for="persona-context">System context</label>
                    <Textarea
                        id="persona-context"
                        v-model="form.system_context"
                        rows="4"
                        auto-resize
                        fluid
                        placeholder="Injected into the agent's system prompt…"
                    />
                </div>

                <div class="field">
                    <label>Allowed domains</label>
                    <InputChips v-model="form.allowed_domains" fluid separator="," placeholder="docs.rs, rust-lang.org" />
                </div>

                <div class="field">
                    <label>Allowed engines</label>
                    <InputChips v-model="form.allowed_engines" fluid separator="," placeholder="bing, duckduckgo" />
                </div>

                <div class="field">
                    <label>Allowed keywords</label>
                    <InputChips v-model="form.allowed_keywords" fluid separator="," placeholder="rust" />
                </div>

                <div class="field">
                    <label for="persona-params">Default parameters (JSON)</label>
                    <Textarea
                        id="persona-params"
                        v-model="form.default_parameters"
                        rows="3"
                        fluid
                        class="mono"
                        placeholder='{"max_iterations": 6}'
                    />
                    <small class="field-hint">
                        Can only lower the agent's budgets, never raise them. Unknown keys are ignored.
                    </small>
                </div>

                <Message v-if="formError" severity="error">
                    <template #icon><ExclamationCircleIcon class="askowl-icon" /></template>
                    {{ formError }}
                </Message>
            </div>

            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="dialogVisible = false" />
                <Button :label="editing ? 'Save changes' : 'Create persona'" :loading="saving" @click="save()" />
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

.constraints {
    font-size: 0.8125rem;
    color: var(--p-text-muted-color);
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

.mono :deep(textarea) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8125rem;
}
</style>
