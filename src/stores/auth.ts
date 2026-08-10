import { defineStore } from "pinia";
import api from "../api/client";
import type { ApiEnvelope, User } from "../types";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(
      localStorage.getItem("vehiclehub_user") || "null",
    ) as User | null,
    loading: false,
  }),
  getters: {
    authenticated: () => !!localStorage.getItem("vehiclehub_token"),
    canManage: (s) => s.user?.role === "owner",
    isSuperAdmin: (s) => s.user?.role === "super_admin",
    isOwner: (s) => s.user?.role === "owner",
    can: (s) => (permission: string) =>
      s.user?.role === "super_admin" ||
      (s.user?.permissions || []).includes(permission),
  },
  actions: {
    async login(email: string, password: string) {
      this.loading = true;
      try {
        const { data } = await api.post<
          ApiEnvelope<{ user: User; token: string }>
        >("/auth/login", {
          email,
          password,
          device_name: "Vehicle Hub Web",
        });
        this.setSession(data.data);
      } finally {
        this.loading = false;
      }
    },
    async register(payload: Record<string, unknown>) {
      this.loading = true;
      try {
        const { data } = await api.post<
          ApiEnvelope<{ user: User; token: string }>
        >("/auth/register", payload);
        this.setSession(data.data);
      } finally {
        this.loading = false;
      }
    },
    setSession(session: { user: User; token: string }) {
      localStorage.setItem("vehiclehub_token", session.token);
      localStorage.setItem("vehiclehub_user", JSON.stringify(session.user));
      this.user = session.user;
    },
    async fetchMe() {
      const { data } = await api.get<ApiEnvelope<User>>("/me");
      this.user = data.data;
      localStorage.setItem("vehiclehub_user", JSON.stringify(this.user));
    },
    async logout() {
      try {
        await api.post("/auth/logout");
      } finally {
        localStorage.clear();
        this.user = null;
      }
    },
  },
});
