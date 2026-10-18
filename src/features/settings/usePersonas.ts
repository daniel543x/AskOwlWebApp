import { ref } from "vue";
import { apiFetch } from "../../shared/api/http";
import type { PersonaCreate, PersonaRead, PersonaUpdate } from "../../entities/persona";

export function usePersonas() {
  const personas = ref<PersonaRead[]>([]);
  const loading = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    try {
      personas.value = await apiFetch<PersonaRead[]>("/personas");
    } finally {
      loading.value = false;
    }
  }

  async function create(payload: PersonaCreate): Promise<PersonaRead> {
    const persona = await apiFetch<PersonaRead>("/personas", { method: "POST", body: payload });
    personas.value.unshift(persona);
    return persona;
  }

  async function update(id: string, payload: PersonaUpdate): Promise<PersonaRead> {
    const persona = await apiFetch<PersonaRead>(`/personas/${id}`, {
      method: "PATCH",
      body: payload,
    });
    const index = personas.value.findIndex((item) => item.id === id);
    if (index !== -1) {
      personas.value.splice(index, 1, persona);
    }
    return persona;
  }

  async function remove(id: string): Promise<void> {
    await apiFetch<void>(`/personas/${id}`, { method: "DELETE" });
    personas.value = personas.value.filter((item) => item.id !== id);
  }

  return { personas, loading, load, create, update, remove };
}
