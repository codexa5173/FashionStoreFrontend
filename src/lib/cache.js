const DB_NAME = "dress-saas-cache";
const STORE_NAME = "responses";
const VERSION = 2;
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // persistent cache: 30 days
export const LIVE_CACHE_TTL_MS = 0;

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheGet(key, maxAgeMs = CACHE_TTL_MS) {
  try {
    const db = await openDb();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const record = req.result;
        if (!record) return resolve(null);
        if (maxAgeMs >= 0 && Date.now() - (record.updatedAt || 0) > maxAgeMs) return resolve(null);
        resolve(record.value ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function cacheSet(key, value) {
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Cache failure must never break the app.
  }
}

export async function cacheRemove(key, { scope = "tenant" } = {}) {
  const scopedKey = scope === "global" ? `global:${key}` : tenantKey(key);
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      store.delete(scopedKey);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function cacheClearPrefix(prefix) {
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const key = String(cursor.key);
        if (key.startsWith(prefix) || key.includes(`:${prefix}`)) cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function invalidate(keys = [], prefixes = []) {
  await Promise.all([
    ...keys.map(cacheRemove),
    ...prefixes.map(cacheClearPrefix)
  ]);
}

/**
 * Cache-first: return IndexedDB immediately when available.
 * If missing or forceRefresh=true, call the API and store the response.
 */
function tenantKey(key) {
  const slug = (localStorage.getItem("tenantSlug") || import.meta.env.VITE_TENANT_SLUG || "default").toLowerCase();
  return `tenant:${slug}:${key}`;
}

export async function cachedGet(api, url, { key = url, forceRefresh = false, allowStale = false, maxAgeMs = CACHE_TTL_MS, live = false, revalidate = true, scope = "tenant" } = {}) {
  const scopedKey = scope === "global" ? `global:${key}` : tenantKey(key);
  let cachedValue = null;
  if (forceRefresh) await cacheRemove(scopedKey);
  if (!forceRefresh) {
    cachedValue = await cacheGet(scopedKey, live ? LIVE_CACHE_TTL_MS : maxAgeMs);
    if (cachedValue !== null && cachedValue !== undefined) {
      if (revalidate) {
        api.get(url).then((response) => cacheSet(scopedKey, response.data)).catch(() => {});
      }
      return { data: cachedValue, fromCache: true, stale: false };
    }
    if (allowStale) {
      // Read without the TTL for offline/admin workflows.
      cachedValue = await cacheGet(scopedKey, -1);
    }
  }
  try {
    const response = await api.get(url);
    await cacheSet(scopedKey, response.data);
    return { data: response.data, fromCache: false, stale: false };
  } catch (error) {
    if (allowStale && cachedValue !== null && cachedValue !== undefined) {
      return { data: cachedValue, fromCache: true, stale: true };
    }
    throw error;
  }
}
