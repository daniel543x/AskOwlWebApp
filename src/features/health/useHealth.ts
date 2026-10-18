import { onScopeDispose, ref } from "vue";
import { apiFetch } from "../../shared/api/http";

const INTERVAL_MS = 30_000;

export function useHealth() {
  const online = ref<boolean | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function probe(): Promise<void> {
    try {
      await apiFetch<unknown>("/healthy", { skipUnauthorizedRedirect: true });
      online.value = true;
    } catch {
      online.value = false;
    }
  }

  function start(): void {
    void probe();
    if (timer === null) {
      timer = setInterval(() => void probe(), INTERVAL_MS);
    }
  }

  function stop(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  onScopeDispose(stop);

  return { online, probe, start, stop };
}
