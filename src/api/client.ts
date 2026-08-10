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
  if (error.response?.status === 401) {
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
