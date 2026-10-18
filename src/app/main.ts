import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";
import "primeicons/primeicons.css";

import "../assets/style.css";
import App from "./App.vue";
import router from "./router";
import { initTheme } from "../shared/theme/theme";
import { setUnauthorizedHandler } from "../shared/api/http";
import { useAuthStore } from "../features/auth/authStore";
import { useChatStore } from "../features/chat/chatStore";

const app = createApp(App);

app.use(createPinia());
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".app-dark",
    },
  },
});

initTheme();

setUnauthorizedHandler(() => {
  useAuthStore().clearSession();
  useChatStore().reset();
  router.push({ name: "login" });
});

app.use(ToastService);
app.use(ConfirmationService);
app.directive("tooltip", Tooltip);
app.use(router);

app.mount("#app");
