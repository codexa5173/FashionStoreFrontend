import { useEffect, useState } from "react";
import api from "../lib/api";
import { cachedGet } from "../lib/cache";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

// IMPORTANT: browser permission and push subscription are different things.
// A user can keep browser notification permission = "granted" while explicitly
// unsubscribing from this store. Never silently recreate that subscription.
function getPreferenceKey() {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const match = path.match(/^\/shop\/([^/]+)/i);
  const tenant = match?.[1] || localStorage.getItem("tenantSlug") || window.location.hostname;
  return `noorie:push-opt-out:${tenant}`;
}

function isExplicitlyDisabled() {
  try { return localStorage.getItem(getPreferenceKey()) === "1"; } catch { return false; }
}

function markExplicitlyDisabled(value) {
  try {
    if (value) localStorage.setItem(getPreferenceKey(), "1");
    else localStorage.removeItem(getPreferenceKey());
  } catch {}
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!ok) return;
      setSupported(true);

      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        let sub = await reg.pushManager.getSubscription();

        // Do NOT auto-subscribe just because browser permission is granted.
        // Permission may remain granted after the user explicitly disabled this store.
        if (isExplicitlyDisabled()) {
          if (!cancelled) setSubscribed(false);
          return;
        }

        if (sub) {
          // The browser can retain a subscription while the server record is gone.
          // Re-register only when the user has not explicitly opted out.
          try {
            const status = await api.get("/push/status", { params: { endpoint: sub.endpoint } });
            if (!status.data?.registered) {
              await sub.unsubscribe().catch(() => {});
              sub = null;
            }
          } catch {
            // Do not recreate/force-enable on a transient status failure.
          }

          if (sub) {
            try { await api.post("/push/subscribe", sub.toJSON()); } catch {}
          }
        }

        if (!cancelled) setSubscribed(Boolean(sub));
      } catch (e) {
        if (!cancelled) setError("Notifications are unavailable on this browser.");
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  async function toggle() {
    if (!supported || busy) return;
    setBusy(true);
    setError("");

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (sub) {
        // Explicit user action: disable for this store and remove the server record.
        await api.delete("/push/unsubscribe", { data: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
        markExplicitlyDisabled(true);
        setSubscribed(false);
        return;
      }

      if (Notification.permission === "denied") {
        throw new Error("Notifications are blocked in your browser. Allow them in browser site settings first.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSubscribed(false);
        return;
      }

      const { data } = await cachedGet(api, "/push/public-key", { key: "push:public-key", revalidate: true });
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      await api.post("/push/subscribe", sub.toJSON());
      markExplicitlyDisabled(false);
      setSubscribed(true);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Could not update notifications.");
    } finally {
      setBusy(false);
    }
  }

  return { supported, subscribed, busy, error, toggle };
}
