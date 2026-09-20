import { createContext, useContext, useEffect, useState } from "react";
import api, { setTenantSlug } from "../lib/api";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/auth/me").then(r => { setAdmin(r.data.admin); if (r.data.admin?.tenant?.slug) setTenantSlug(r.data.admin.tenant.slug); }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const login = async (username, password, tenantSlug) => { const r = await api.post("/auth/login", { username, password, tenantSlug }); setAdmin(r.data.admin); if (r.data.admin?.tenant?.slug) setTenantSlug(r.data.admin.tenant.slug); };
  const logout = async () => { await api.post("/auth/logout"); setAdmin(null); setTenantSlug(null); };
  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
