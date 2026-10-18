import { ref } from "vue";
import { apiFetch } from "../../shared/api/http";
import { MODEL_KINDS, type ModelEntry, type ModelKind, type PreferenceRead } from "../../entities/models";

export function useModels() {
  const entries = ref<Partial<Record<ModelKind, ModelEntry[]>>>({});
  const preferences = ref<PreferenceRead[]>([]);
  const loading = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    try {
      const [lists, prefs] = await Promise.all([
        Promise.all(
          MODEL_KINDS.map(async (kind) => ({
            kind,
            models: await apiFetch<ModelEntry[]>("/models", { params: { kind } }),
          })),
        ),
        apiFetch<PreferenceRead[]>("/models/preferences"),
      ]);
      const grouped: Partial<Record<ModelKind, ModelEntry[]>> = {};
      for (const { kind, models } of lists) {
        grouped[kind] = models.filter((model) => model.is_active);
      }
      entries.value = grouped;
      preferences.value = prefs;
    } finally {
      loading.value = false;
    }
  }

  function preferredModelId(kind: ModelKind): string | null {
    return preferences.value.find((preference) => preference.kind === kind)?.selected_model_id ?? null;
  }

  async function setPreference(kind: ModelKind, modelId: string): Promise<void> {
    const preference = await apiFetch<PreferenceRead>(`/models/${modelId}/preference`, {
      method: "PUT",
    });
    const index = preferences.value.findIndex((item) => item.kind === kind);
    if (index === -1) {
      preferences.value.push(preference);
    } else {
      preferences.value.splice(index, 1, preference);
    }
  }

  return { entries, preferences, loading, load, preferredModelId, setPreference };
}
