import { ref } from "vue";
import { apiFetch } from "../../shared/api/http";
import type { ApiKeyCreate, ApiKeyCreated, ApiKeyRead } from "../../entities/apiKey";

export function useApiKeys() {
  const keys = ref<ApiKeyRead[]>([]);
  const loading = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    try {
      keys.value = await apiFetch<ApiKeyRead[]>("/api-keys");
    } finally {
      loading.value = false;
    }
  }

  async function create(payload: ApiKeyCreate): Promise<ApiKeyCreated> {
    const created = await apiFetch<ApiKeyCreated>("/api-keys", { method: "POST", body: payload });
    keys.value.unshift(created);
    return created;
  }

  async function remove(id: string): Promise<void> {
    await apiFetch<void>(`/api-keys/${id}`, { method: "DELETE" });
    keys.value = keys.value.filter((item) => item.id !== id);
  }

  return { keys, loading, load, create, remove };
}
