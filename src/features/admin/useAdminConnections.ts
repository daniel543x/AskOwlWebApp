import { ref } from "vue";
import { apiFetch } from "../../shared/api/http";
import type { Provider, ProviderCreate, ProviderUpdate } from "../../entities/provider";

export function useAdminConnections() {
  const providers = ref<Provider[]>([]);
  const loading = ref(false);
  const probing = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    try {
      providers.value = await apiFetch<Provider[]>("/admin/models/providers");
    } finally {
      loading.value = false;
    }
  }

  async function probe(): Promise<void> {
    probing.value = true;
    try {
      providers.value = await apiFetch<Provider[]>("/health/models");
    } finally {
      probing.value = false;
    }
  }

  async function create(payload: ProviderCreate): Promise<Provider> {
    const created = await apiFetch<Provider>("/admin/models/providers", {
      method: "POST",
      body: payload,
    });
    providers.value.unshift(created);
    return created;
  }

  async function update(id: string, payload: ProviderUpdate): Promise<Provider> {
    const updated = await apiFetch<Provider>(`/admin/models/providers/${id}`, {
      method: "PATCH",
      body: payload,
    });
    const index = providers.value.findIndex((provider) => provider.id === id);
    if (index !== -1) {
      providers.value.splice(index, 1, updated);
    }
    return updated;
  }

  async function remove(id: string): Promise<void> {
    await apiFetch<void>(`/admin/models/providers/${id}`, { method: "DELETE" });
    providers.value = providers.value.filter((provider) => provider.id !== id);
  }

  return { providers, loading, probing, load, probe, create, update, remove };
}
