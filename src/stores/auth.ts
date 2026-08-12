import { defineStore } from "pinia";
import api from "../api/client";
import type { ApiEnvelope, User } from "../types";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(
      localStorage.getItem("vehiclehub_user") || "null",
    ) as User | null,
    loading: false,
    impersonating: !!localStorage.getItem("vehiclehub_admin_token"),
  }),
  getters: {
    authenticated: () => !!localStorage.getItem("vehiclehub_token"),
    canManage: (s) => s.user?.role === "owner",
    isSuperAdmin: (s) => s.user?.role === "super_admin",
    isOwner: (s) => s.user?.role === "owner",
    isImpersonating: (s) => s.impersonating,
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
    async impersonate(userId: number) {
      const { data } = await api.post<
        ApiEnvelope<{ user: User; token: string }>
      >(`/superadmin/users/${userId}/impersonate`);
      const adminToken = localStorage.getItem("vehiclehub_token");
      const adminUser = localStorage.getItem("vehiclehub_user");
      if (adminToken) localStorage.setItem("vehiclehub_admin_token", adminToken);
      if (adminUser) localStorage.setItem("vehiclehub_admin_user", adminUser);
      this.impersonating = true;
      this.setSession(data.data);
    },
    async stopImpersonating() {
      const adminToken = localStorage.getItem("vehiclehub_admin_token");
      const adminUser = localStorage.getItem("vehiclehub_admin_user");
      if (!adminToken || !adminUser) return;
      try {
        await api.post("/auth/logout");
      } catch {
        // The Super Admin session can still be restored if the temporary token expired.
      }
      localStorage.setItem("vehiclehub_token", adminToken);
      localStorage.setItem("vehiclehub_user", adminUser);
      localStorage.removeItem("vehiclehub_admin_token");
      localStorage.removeItem("vehiclehub_admin_user");
      this.user = JSON.parse(adminUser) as User;
      this.impersonating = false;
    },
    async logout() {
      try {
        await api.post("/auth/logout");
      } finally {
        localStorage.clear();
        this.user = null;
        this.impersonating = false;
      }
    },
  },
});
