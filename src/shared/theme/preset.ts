import { definePreset } from "@primevue/themes";
import Aura from "@primevue/themes/aura";

/**
 * AskOwl preset — "Gleap" style language (docs/design/DESIGN.md):
 * warm cream-paper canvas, white cards, graphite-ink primary CTAs,
 * one chromatic accent (lime, status dots/checkmarks only).
 * The status palettes (green/red/sky/...) are aliased to warm-neutral
 * ramps so every success/warn/error surface stays achromatic.
 */

// Warm neutral ramp used for status surfaces (success / info / warn / help).
const STATUS_NEUTRAL = {
  50: "#f4f4f1",
  100: "#ecece7",
  200: "#dcdcd5",
  300: "#c4c4bc",
  400: "#8f8f8a",
  500: "#6f6f6b",
  600: "#5c5c58",
  700: "#494946",
  800: "#353532",
  900: "#232320",
  950: "#141412",
};

// Darker ink ramp for danger/destructive affordances (still achromatic).
const DANGER_NEUTRAL = {
  50: "#f2f2ef",
  100: "#e8e8e3",
  200: "#d3d3cb",
  300: "#9a9a93",
  400: "#6f6f6b",
  500: "#353533",
  600: "#292927",
  700: "#1c1c1a",
  800: "#141412",
  900: "#0f0f0e",
  950: "#0a0a09",
};

export const AskOwlPreset = definePreset(Aura, {
  semantic: {
    primary: {
      // Light mode CTA = graphite ink (500); dark mode CTA = cream (400).
      50: "#f3f3f0",
      100: "#e9e9e4",
      200: "#f7f6f2",
      300: "#f0efe9",
      400: "#e8e7e1",
      500: "#141414",
      600: "#2e2e2c",
      700: "#40403e",
      800: "#545452",
      900: "#292929",
      950: "#141414",
    },
    formField: {
      borderRadius: "200px",
    },
    overlay: {
      select: {
        borderRadius: "12px",
      },
      popover: {
        borderRadius: "12px",
      },
    },
    colorScheme: {
      light: {
        surface: {
          0: "#ffffff",
          50: "#f7f6f3",
          100: "#efeee9",
          200: "#e4e3dc",
          300: "#d6d5cd",
          400: "#c2c1b9",
          500: "#767672",
          600: "#5f5f5b",
          700: "#4a4a47",
          800: "#353532",
          900: "#232220",
          950: "#141413",
        },
        text: {
          color: "#292929",
          hoverColor: "#141414",
          mutedColor: "#6f6f6b",
          hoverMutedColor: "#5f5f5b",
        },
        content: {
          background: "#edede8",
          hoverBackground: "#e3e2da",
          borderColor: "#d8d7cf",
        },
        card: {
          background: "#ffffff",
        },
      },
      dark: {
        surface: {
          0: "#ecebe6",
          50: "#dfded8",
          100: "#c8c7c0",
          200: "#a5a49d",
          300: "#807f78",
          400: "#6c6b64",
          500: "#55544e",
          600: "#47463f",
          700: "#3a3a34",
          800: "#2b2b27",
          900: "#212120",
          950: "#191917",
        },
        text: {
          mutedColor: "#9d9c95",
          hoverMutedColor: "#b5b4ad",
        },
        content: {
          background: "#171716",
          hoverBackground: "#262622",
          borderColor: "#33332e",
        },
        card: {
          background: "#212120",
        },
      },
    },
  },
  primitive: {
    green: STATUS_NEUTRAL,
    sky: STATUS_NEUTRAL,
    blue: STATUS_NEUTRAL,
    orange: STATUS_NEUTRAL,
    amber: STATUS_NEUTRAL,
    yellow: STATUS_NEUTRAL,
    purple: STATUS_NEUTRAL,
    red: DANGER_NEUTRAL,
    lime: STATUS_NEUTRAL,
  },
  components: {
    textarea: {
      borderRadius: "12px",
    },
    dialog: {
      borderRadius: "12px",
    },
    message: {
      borderRadius: "12px",
    },
    toast: {
      borderRadius: "12px",
    },
    tag: {
      borderRadius: "9999px",
      fontWeight: "500",
    },
    togglebutton: {
      borderRadius: "200px",
      content: {
        borderRadius: "9999px",
      },
    },
    multiselect: {
      overlay: {
        borderRadius: "12px",
      },
    },
    datepicker: {
      panel: {
        borderRadius: "12px",
      },
    },
    tabs: {
      tablist: {
        background: "{content.hover.background}",
        borderColor: "transparent",
        borderWidth: "0",
      },
      tab: {
        background: "transparent",
        hoverBackground: "transparent",
        activeBackground: "{primary.color}",
        borderColor: "transparent",
        hoverBorderColor: "transparent",
        activeBorderColor: "transparent",
        color: "{text.muted.color}",
        hoverColor: "{text.color}",
        activeColor: "{primary.contrast.color}",
        fontWeight: "500",
      },
      tabpanel: {
        background: "transparent",
      },
      activeBar: {
        background: "transparent",
        height: "0",
      },
    },
  },
});
