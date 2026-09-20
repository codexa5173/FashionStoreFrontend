import { createContext, useContext, useLayoutEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api, { setTenantSlug } from "../lib/api";
import { cachedGet, cacheRemove } from "../lib/cache";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { tenantSlug } = useParams();
  const host = window.location.hostname;
  const isExplicitStorePath = Boolean(tenantSlug);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const storeKey = isExplicitStorePath
    ? `store:public:${tenantSlug}`
    : `store:public:domain:${host}`;

  const loadStore = useCallback(async (forceRefresh = false) => {
    if (tenantSlug) setTenantSlug(tenantSlug);
    setLoading(true);
    setError("");
    try {
      const r = await cachedGet(
        api,
        isExplicitStorePath ? `/tenants/${encodeURIComponent(tenantSlug)}` : "/tenants/resolve",
        { key: storeKey, forceRefresh, revalidate: true }
      );
      setStore(r.data);
      if (r.data?.tenant?.slug) setTenantSlug(r.data.tenant.slug);
    } catch (e) {
      setStore(null);
      setError(e.response?.data?.message || "Store not found.");
    } finally { setLoading(false); }
  }, [tenantSlug, host, isExplicitStorePath, storeKey]);

  useLayoutEffect(() => {
    let cancelled = false;
    loadStore(false);
    return () => { cancelled = true; };
  }, [loadStore]);

  const refreshStore = useCallback(async () => {
    await cacheRemove(storeKey);
    await loadStore(true);
  }, [storeKey, loadStore]);

  const value = {
    tenantSlug: store?.tenant?.slug || tenantSlug || "",
    store,
    loading,
    error,
    refreshStore,
    isTenantDomain: Boolean(store && !isExplicitStorePath && store.resolution?.source !== "header")
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext) || { tenantSlug: "", store: null, loading: false, error: "", isTenantDomain: false };
}

export function storePath(tenantSlug, path = "", isTenantDomain = false) {
  const base = isTenantDomain ? "" : (tenantSlug ? `/shop/${tenantSlug}` : "");
  if (!path) return base || "/";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
