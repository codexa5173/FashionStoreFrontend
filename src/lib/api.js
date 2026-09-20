import axios from "axios";

const configuredUrl = import.meta.env.VITE_API_URL?.trim();
const api = axios.create({
  baseURL: configuredUrl || "http://localhost:5000/api",
  withCredentials: true,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000)
});

export default api;

api.interceptors.request.use((config) => {
  const pathname = window.location.pathname;
  const storeMatch = pathname.match(/^\/shop\/([^/]+)/i);
  const isAdminRequest = pathname.startsWith("/admin") || pathname.startsWith("/super-admin");
  const tenantSlug = storeMatch?.[1]
    || (isAdminRequest ? localStorage.getItem("tenantSlug") : null);
  if (tenantSlug) config.headers["X-Tenant-Slug"] = tenantSlug;
  const csrf = document.cookie.split("; ").find((row) => row.startsWith("csrf_token="))?.split("=")[1];
  if (csrf && !["get", "head", "options"].includes(String(config.method || "get").toLowerCase())) {
    config.headers["X-CSRF-Token"] = decodeURIComponent(csrf);
  }
  return config;
});

export function setTenantSlug(slug) {
  if (slug) localStorage.setItem("tenantSlug", String(slug).toLowerCase());
  else localStorage.removeItem("tenantSlug");
}
