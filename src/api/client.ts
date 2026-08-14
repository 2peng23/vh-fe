import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vehiclehub_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  const accessCode = error.response?.data?.code;
  if (
    error.response?.status === 403 &&
    ["PLAN_ENDED", "BUSINESS_INACTIVE", "STAFF_INACTIVE"].includes(accessCode)
  ) {
    const session = error.response?.data?.data;
    if (session?.token && session?.user) {
      localStorage.setItem("vehiclehub_token", session.token);
      localStorage.setItem("vehiclehub_user", JSON.stringify(session.user));
    } else {
      const cachedUser = JSON.parse(
        localStorage.getItem("vehiclehub_user") || "null",
      );
      if (cachedUser?.business) {
        if (accessCode === "PLAN_ENDED" && cachedUser.business.subscription) {
          cachedUser.business.subscription.plan_ended = true;
          cachedUser.business.subscription.status = "past_due";
        }
        if (accessCode === "BUSINESS_INACTIVE")
          cachedUser.business.status = "inactive";
        if (accessCode === "STAFF_INACTIVE") cachedUser.status = "inactive";
        localStorage.setItem("vehiclehub_user", JSON.stringify(cachedUser));
      }
    }
    window.dispatchEvent(new CustomEvent("vehiclehub-access-changed"));
    const destination =
      accessCode === "STAFF_INACTIVE"
        ? "/staff-disabled"
        : accessCode === "BUSINESS_INACTIVE"
          ? "/business-disabled"
          : "/";
    const allowsExpiredPlan =
      accessCode === "PLAN_ENDED" && location.pathname === "/plan-transactions";
    if (!allowsExpiredPlan && location.pathname !== destination)
      location.assign(destination);
  }
  if (error.response?.status === 401) {
    const adminToken = localStorage.getItem("vehiclehub_admin_token");
    const adminUser = localStorage.getItem("vehiclehub_admin_user");
    if (adminToken && adminUser) {
      localStorage.setItem("vehiclehub_token", adminToken);
      localStorage.setItem("vehiclehub_user", adminUser);
      localStorage.removeItem("vehiclehub_admin_token");
      localStorage.removeItem("vehiclehub_admin_user");
      if (!location.pathname.startsWith("/superadmin"))
        location.assign("/superadmin");
      return Promise.reject(error);
    }
    localStorage.removeItem("vehiclehub_token");
    localStorage.removeItem("vehiclehub_user");
    if (!location.pathname.startsWith("/login")) location.assign("/login");
  }
  return Promise.reject(error);
});

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error))
    return error.response?.data?.message || error.message;
  return "Something went wrong. Please try again.";
}

export function validationErrors(error: unknown): Record<string, string[]> {
  return axios.isAxiosError(error) ? error.response?.data?.errors || {} : {};
}

export default api;
