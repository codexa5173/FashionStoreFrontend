const DB_NAME = "noorie-offline";
const STORE_NAME = "mutations";
const VERSION = 3;

function currentTenant() {
  return String(localStorage.getItem("tenantSlug") || import.meta.env.VITE_TENANT_SLUG || "default").toLowerCase();
}

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("tenant", "tenant", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(mode = "readonly") {
  return openDb().then(db => db ? db.transaction(STORE_NAME, mode).objectStore(STORE_NAME) : null);
}

export async function enqueueMutation({ method = "POST", url, data = null, label = "Offline change", idempotencyKey = "" }) {
  const store = await transaction("readwrite");
  if (!store) throw new Error("Offline storage is unavailable on this device.");
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record = {
    id,
    tenant: currentTenant(),
    method: String(method).toUpperCase(),
    url,
    data,
    label,
    idempotencyKey: idempotencyKey || "",
    status: "queued",
    attempts: 0,
    lastError: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await new Promise((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
  return record;
}

export async function listMutations({ includeResolved = false, tenant = currentTenant() } = {}) {
  const store = await transaction("readonly");
  if (!store) return [];
  return await new Promise((resolve, reject) => {
    const req = store.index("tenant").getAll(tenant);
    req.onsuccess = () => {
      let rows = (req.result || []).sort((a, b) => a.createdAt - b.createdAt);
      if (!includeResolved) rows = rows.filter(x => !["synced"].includes(x.status));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateMutation(id, patch) {
  const store = await transaction("readwrite");
  if (!store) return null;
  return await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) return resolve(null);
      const next = { ...req.result, ...patch, updatedAt: Date.now() };
      const put = store.put(next);
      put.onsuccess = () => resolve(next);
      put.onerror = () => reject(put.error);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeMutation(id) {
  const store = await transaction("readwrite");
  if (!store) return;
  await new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

export async function clearResolvedMutations() {
  const rows = await listMutations({ includeResolved: true });
  for (const row of rows) if (row.status === "synced") await removeMutation(row.id);
}

export function isNetworkError(error) {
  return !error?.response || ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error?.code);
}

/**
 * Replay one tenant's queued mutations in creation order.
 * 409/422/400/403 conflicts are stopped and retained for manual resolution;
 * network/5xx failures remain queued for a later attempt.
 */
export async function syncOfflineMutations(api, { tenant = currentTenant(), onProgress } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { synced: 0, pending: (await listMutations({ tenant })).length, conflicts: 0 };
  }
  const rows = await listMutations({ tenant });
  let synced = 0, conflicts = 0;
  for (const row of rows) {
    if (!["queued", "retry"].includes(row.status)) continue;
    await updateMutation(row.id, { status: "syncing", attempts: Number(row.attempts || 0) + 1 });
    try {
      const response = await api.request({
        method: row.method,
        url: row.url,
        data: row.data,
        headers: row.idempotencyKey ? { "Idempotency-Key": row.idempotencyKey } : undefined
      });
      await updateMutation(row.id, {
        status: "synced",
        lastError: "",
        response: response.data || null
      });
      synced += 1;
      onProgress?.();
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      const message = error?.response?.data?.message || error?.message || "Sync failed.";
      const conflict = [400, 409, 422, 403].includes(status);
      await updateMutation(row.id, {
        status: conflict ? "conflict" : "retry",
        lastError: message
      });
      if (conflict) {
        conflicts += 1;
        onProgress?.();
        continue;
      }
      // Stop the batch on network/server failure; later records may depend on
      // earlier inventory changes.
      break;
    }
  }
  return {
    synced,
    conflicts,
    pending: (await listMutations({ tenant })).filter(x => ["queued", "retry", "syncing"].includes(x.status)).length
  };
}
