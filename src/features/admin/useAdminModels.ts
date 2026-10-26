import { ref } from "vue";
import { apiFetch } from "../../shared/api/http";
import {
  MODEL_KINDS,
  type DefaultModel,
  type GlobalDefaults,
  type ModelEntry,
  type ModelEntryCreate,
  type ModelEntryUpdate,
  type ModelKind,
} from "../../entities/models";

export function useAdminModels() {
  const entries = ref<ModelEntry[]>([]);
  const defaults = ref<Partial<Record<ModelKind, string>>>({});
  const loading = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    try {
      const [lists, defaultsRead] = await Promise.all([
        Promise.all(
          MODEL_KINDS.map(async (kind) => apiFetch<ModelEntry[]>("/admin/models/entries", { params: { kind } })),
        ),
        apiFetch<GlobalDefaults>("/admin/models/defaults"),
      ]);
      const flat: ModelEntry[] = [];
      for (const list of lists) {
        flat.push(...list);
      }
      entries.value = flat;
      defaults.value = defaultsRead.defaults;
    } finally {
      loading.value = false;
    }
  }

  async function create(payload: ModelEntryCreate): Promise<ModelEntry> {
    const created = await apiFetch<ModelEntry>("/admin/models/entries", {
      method: "POST",
      body: payload,
    });
    entries.value.unshift(created);
    return created;
  }

  async function update(id: string, payload: ModelEntryUpdate): Promise<ModelEntry> {
    const updated = await apiFetch<ModelEntry>(`/admin/models/entries/${id}`, {
      method: "PATCH",
      body: payload,
    });
    const index = entries.value.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      entries.value.splice(index, 1, updated);
    }
    return updated;
  }

  async function remove(id: string): Promise<void> {
    await apiFetch<void>(`/admin/models/entries/${id}`, { method: "DELETE" });
    entries.value = entries.value.filter((entry) => entry.id !== id);
  }

  async function setDefault(kind: ModelKind, modelId: string): Promise<DefaultModel> {
    const result = await apiFetch<DefaultModel>(`/admin/models/defaults/${kind}`, {
      method: "PUT",
      params: { model_id: modelId },
    });
    defaults.value = { ...defaults.value, [kind]: result.model_id };
    return result;
  }

  function providerOptions(): string[] {
    return [...new Set(entries.value.map((entry) => entry.provider_name ?? "").filter(Boolean))];
  }

  return { entries, defaults, loading, load, create, update, remove, setDefault, providerOptions };
}
