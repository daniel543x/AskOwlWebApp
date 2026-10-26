import { ref } from "vue";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "askowl.theme";

function resolveInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyDocumentClass(mode: ThemeMode): void {
  document.documentElement.classList.toggle("app-dark", mode === "dark");
}

const mode = ref<ThemeMode>(resolveInitialMode());

applyDocumentClass(mode.value);

export function useTheme() {
  function setMode(next: ThemeMode, persist: boolean): void {
    mode.value = next;
    applyDocumentClass(next);
    if (persist) {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }

  function toggle(): void {
    setMode(mode.value === "dark" ? "light" : "dark", true);
  }

  return { mode, setMode, toggle };
}

export function initTheme(): void {
  applyDocumentClass(mode.value);
}
