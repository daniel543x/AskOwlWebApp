<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import Select from "primevue/select";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { useToast } from "primevue/usetoast";
import {
    ArrowPathIcon,
    CubeIcon,
    InformationCircleIcon,
    KeyIcon,
    UserCircleIcon,
} from "@heroicons/vue/24/outline";
import { ApiError } from "../../shared/api/http";
import { MODEL_KINDS, type ModelKind } from "../../entities/models";
import { useModels } from "../../features/settings/useModels";
import PersonaManager from "../../components/settings/PersonaManager.vue";
import ApiKeyManager from "../../components/settings/ApiKeyManager.vue";

const toast = useToast();
const modelsStore = useModels();

const activeTab = ref<"models" | "personas" | "keys">("models");
const pendingKind = ref<ModelKind | null>(null);

const KIND_LABELS: Record<ModelKind, string> = {
  chat: "Chat model",
  embedding: "Embedding model",
  reranker: "Reranker model",
  decision: "Decision model",
};

const KIND_HINTS: Record<ModelKind, string> = {
  chat: "Answers questions, rewrites queries, writes reports — needs the tools capability.",
  embedding: "Embeds page chunks for the hybrid vector retrieval.",
  reranker: "Cross-encoder that reorders candidate chunks by relevance.",
  decision: "Optional pre-scoring layer (query choice, grounding confidence).",
};

const visibleKinds = computed(() =>
  MODEL_KINDS.filter((kind) => (modelsStore.entries.value[kind]?.length ?? 0) > 0),
);

onMounted(() => {
  modelsStore
    .load()
    .catch((error: unknown) => {
      toast.add({
        severity: "error",
        summary: "Model catalog unavailable",
        detail: error instanceof ApiError ? error.message : "Could not load models.",
        life: 6000,
      });
    });
});

function optionsFor(kind: ModelKind) {
  return (modelsStore.entries.value[kind] ?? []).map((model) => ({
    id: model.id,
    label: model.display_name || model.model_name,
    provider: model.provider_name || model.provider_type || "",
  }));
}

async function changePreference(kind: ModelKind, modelId: string): Promise<void> {
  pendingKind.value = kind;
  try {
    await modelsStore.setPreference(kind, modelId);
    toast.add({ severity: "success", summary: `${KIND_LABELS[kind]} default updated`, life: 3000 });
  } catch (error: unknown) {
    toast.add({
      severity: "error",
      summary: "Preference not saved",
      detail: error instanceof ApiError ? error.message : "Unexpected error.",
      life: 6000,
    });
    await modelsStore.load();
  } finally {
    pendingKind.value = null;
  }
}
</script>

<template>
    <div class="settings-view-inner">
        <header class="settings-head">
            <h1>Settings</h1>
            <p class="settings-sub">Your account-level defaults and personal data.</p>
        </header>

        <Tabs v-model:value="activeTab" scrollable>
            <TabList>
                <Tab value="models"><CubeIcon class="askowl-icon" /> Models</Tab>
                <Tab value="personas"><UserCircleIcon class="askowl-icon" /> Personas</Tab>
                <Tab value="keys"><KeyIcon class="askowl-icon" /> API Keys</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="models">
                    <div class="models-panel">
                        <Message
                            v-if="visibleKinds.length === 0 && !modelsStore.loading.value"
                            severity="info"
                        >
                            <template #icon><InformationCircleIcon class="askowl-icon" /></template>
                            The model catalog is empty — an administrator has to register providers
                            and models.
                        </Message>

                        <section
                            v-for="kind in visibleKinds"
                            :key="kind"
                            class="kind-section"
                        >
                            <div class="kind-head">
                                <h2>{{ KIND_LABELS[kind] }}</h2>
                                <p class="kind-hint">{{ KIND_HINTS[kind] }}</p>
                            </div>
                            <Select
                                class="kind-select"
                                :model-value="modelsStore.preferredModelId(kind)"
                                :options="optionsFor(kind)"
                                option-label="label"
                                option-value="id"
                                :loading="pendingKind === kind"
                                placeholder="Global default"
                                @update:model-value="changePreference(kind, $event)"
                            >
                                <template #option="{ option }">
                                    <span class="model-option">
                                        <span>{{ option.label }}</span>
                                        <span v-if="option.provider" class="model-provider">
                                            {{ option.provider }}
                                        </span>
                                    </span>
                                </template>
                            </Select>
                        </section>

                        <div class="panel-foot">
                            <Button
                                label="Reload catalog"
                                text
                                size="small"
                                :loading="modelsStore.loading.value"
                                @click="modelsStore.load()"
                            >
                                <template #icon><ArrowPathIcon class="askowl-icon" /></template>
                                <template #loadingicon><ArrowPathIcon class="askowl-icon spin" /></template>
                            </Button>
                        </div>
                    </div>
                </TabPanel>
                <TabPanel value="personas">
                    <PersonaManager />
                </TabPanel>
                <TabPanel value="keys">
                    <ApiKeyManager />
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>

<style scoped>
.settings-view-inner {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2rem;
    max-width: 56rem;
    margin: 0 auto;
    width: 100%;
}

.settings-head h1 {
    margin: 0 0 0.25rem;
    font-size: 2rem;
    font-weight: 400;
    letter-spacing: -0.01em;
}

.settings-sub {
    margin: 0 0 1.5rem;
    color: var(--p-text-muted-color);
}

.models-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-top: 0.5rem;
}

.kind-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1.125rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: 12px;
    background: var(--p-card-background);
}

.kind-head {
    flex: 1;
    min-width: 0;
}

.kind-head h2 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 500;
}

.kind-hint {
    margin: 0.125rem 0 0;
    font-size: 0.8125rem;
    color: var(--p-text-muted-color);
}

.kind-select {
    width: 16rem;
    flex-shrink: 0;
}

.model-option {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    justify-content: space-between;
    width: 100%;
}

.model-provider {
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
}

.panel-foot {
    display: flex;
    justify-content: flex-end;
}

@media (max-width: 640px) {
    .kind-section {
        flex-direction: column;
        align-items: stretch;
    }

    .kind-select {
        width: 100%;
    }
}
</style>
