<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { useToast } from "primevue/usetoast";
import { ArrowPathIcon, InformationCircleIcon } from "@heroicons/vue/24/outline";
import { ApiError } from "../../shared/api/http";
import { MODEL_KINDS, type ModelEntry, type ModelKind } from "../../entities/models";
import { useAdminModels } from "../../features/admin/useAdminModels";

const toast = useToast();
const { entries, defaults, loading, load, setDefault } = useAdminModels();

const pendingKind = ref<ModelKind | null>(null);

onMounted(() => {
  load().catch((error: unknown) => {
    toast.add({
      severity: "error",
      summary: "Defaults unavailable",
      detail: error instanceof ApiError ? error.message : "Could not load global defaults.",
      life: 6000,
    });
  });
});

function activeEntries(kind: ModelKind): ModelEntry[] {
  return entries.value.filter((entry) => entry.kind === kind && entry.is_active);
}

function optionsFor(kind: ModelKind) {
  return activeEntries(kind).map((entry) => ({
    id: entry.id,
    label: entry.display_name || entry.model_name,
    provider: entry.provider_name ?? "",
  }));
}

const KIND_LABELS: Record<ModelKind, string> = {
  chat: "Chat model",
  embedding: "Embedding model",
  reranker: "Reranker model",
  decision: "Decision model",
};

const visibleKinds = computed(() => MODEL_KINDS.filter((kind) => activeEntries(kind).length > 0));

async function changeDefault(kind: ModelKind, modelId: string): Promise<void> {
  pendingKind.value = kind;
  try {
    await setDefault(kind, modelId);
    toast.add({ severity: "success", summary: `${KIND_LABELS[kind]} default updated`, life: 3000 });
  } catch (error: unknown) {
    toast.add({
      severity: "error",
      summary: "Default not saved",
      detail: error instanceof ApiError ? error.message : "Unexpected error.",
      life: 6000,
    });
    await load();
  } finally {
    pendingKind.value = null;
  }
}
</script>

<template>
    <div class="defaults-panel">
        <p class="panel-hint">
            Global fallbacks when a user preference or per-request override is missing.
            Only active entries can be chosen.
        </p>

        <div v-if="loading" class="defaults-skeleton">
            <Skeleton v-for="i in 2" :key="i" height="2.5rem" width="100%" />
        </div>
        <template v-else>
            <Message v-if="visibleKinds.length === 0" severity="info">
                <template #icon><InformationCircleIcon class="askowl-icon" /></template>
                Register and activate model entries first — then set kind-wide defaults here.
            </Message>
            <section v-for="kind in visibleKinds" :key="kind" class="kind-row">
                <div class="kind-label">
                    <span class="kind-name">{{ KIND_LABELS[kind] }}</span>
                    <code class="kind-slug">{{ kind }}</code>
                </div>
                <Select
                    class="kind-select"
                    :model-value="defaults[kind] ?? null"
                    :options="optionsFor(kind)"
                    option-label="label"
                    option-value="id"
                    :loading="pendingKind === kind"
                    placeholder="No default"
                    show-clear
                    @update:model-value="changeDefault(kind, $event)"
                >
                    <template #option="{ option }">
                        <span class="model-option">
                            <span>{{ option.label }}</span>
                            <span v-if="option.provider" class="model-provider">{{ option.provider }}</span>
                        </span>
                    </template>
                </Select>
            </section>

            <div class="panel-foot">
                <Button
                    label="Reload"
                    text
                    size="small"
                    :loading="loading"
                    @click="load()"
                >
                    <template #icon><ArrowPathIcon class="askowl-icon" /></template>
                    <template #loadingicon><ArrowPathIcon class="askowl-icon spin" /></template>
                </Button>
            </div>
        </template>
    </div>
</template>

<style scoped>
.panel-hint {
    margin: 0 0 1rem;
    color: var(--p-text-muted-color);
    font-size: 0.875rem;
}

.defaults-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 0.5rem;
}

.defaults-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.kind-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1.125rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
    background: var(--p-card-background);
}

.kind-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
}

.kind-name {
    font-weight: 500;
}

.kind-slug {
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
}

.kind-select {
    flex-basis: 18rem;
}

.model-option {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
}

.model-provider {
    color: var(--p-text-muted-color);
    font-size: 0.75rem;
}

.panel-foot {
    display: flex;
    justify-content: flex-end;
}
</style>
