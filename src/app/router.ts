import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../features/auth/authStore";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("../components/auth/AuthLayout.vue"),
      children: [
        { path: "", redirect: "/chat" },
        {
          path: "login",
          name: "login",
          component: () => import("../pages/auth/Login.vue"),
          meta: { public: true },
        },
        {
          path: "register",
          name: "register",
          component: () => import("../pages/auth/Register.vue"),
          meta: { public: true },
        },
      ],
    },
    {
      path: "/chat",
      component: () => import("../components/layout/AppShell.vue"),
      children: [
        {
          path: "",
          name: "chat",
          component: () => import("../pages/chat/ChatView.vue"),
        },
        {
          path: ":conversationId",
          name: "conversation",
          component: () => import("../pages/chat/ChatView.vue"),
        },
      ],
    },
    {
      path: "/settings",
      component: () => import("../components/layout/AppShell.vue"),
      children: [
        {
          path: "",
          name: "settings",
          component: () => import("../pages/settings/SettingsView.vue"),
        },
      ],
    },
    {
      path: "/admin",
      component: () => import("../components/layout/AppShell.vue"),
      children: [
        {
          path: "",
          name: "admin",
          component: () => import("../pages/admin/AdminView.vue"),
        },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/chat" },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    return auth.isAuthenticated ? { name: "chat" } : true;
  }

  if (!auth.isAuthenticated) {
    return { name: "login" };
  }

  try {
    await auth.ensureUser();
    return true;
  } catch {
    return auth.isAuthenticated ? true : { name: "login" };
  }
});

export default router;
