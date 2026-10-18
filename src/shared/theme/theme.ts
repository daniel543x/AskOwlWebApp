import { ref } from "vue";
import { updatePrimaryPalette } from "@primevue/themes";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "askowl.theme";

const PRIMARY_PALETTES: Record<ThemeMode, Record<string, string>> = {
  dark: {
    50: "{teal.50}",
    100: "{teal.100}",
    200: "{teal.200}",
    300: "{teal.300}",
    400: "{teal.400}",
    500: "{teal.500}",
    600: "{teal.600}",
    700: "{teal.700}",
    800: "{teal.800}",
    900: "{teal.900}",
    950: "{teal.950}",
  },
  light: {
    50: "{indigo.50}",
    100: "{indigo.100}",
    200: "{indigo.200}",
    300: "{indigo.300}",
    400: "{indigo.400}",
    500: "{indigo.500}",
    600: "{indigo.600}",
    700: "{indigo.700}",
    800: "{indigo.800}",
    900: "{indigo.900}",
    950: "{indigo.950}",
  },
};

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

function applyPalette(mode: ThemeMode): void {
  updatePrimaryPalette(PRIMARY_PALETTES[mode]);
}

const mode = ref<ThemeMode>(resolveInitialMode());

applyDocumentClass(mode.value);

export function useTheme() {
  function setMode(next: ThemeMode, persist: boolean): void {
    mode.value = next;
    applyDocumentClass(next);
    applyPalette(next);
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
  applyPalette(mode.value);
}
