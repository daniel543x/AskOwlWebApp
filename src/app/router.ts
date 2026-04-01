import { createRouter, createWebHistory } from "vue-router";
import Login from "../pages/auth/Login.vue";
import Register from "../pages/auth/Register.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/register",
      name: "register",
      component: Register,
    },
    {
      path: "/",
      redirect: "/login",
    },
  ],
});

export default router;
