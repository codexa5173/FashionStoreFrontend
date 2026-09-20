import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import api from "./lib/api";
import "./index.css";

function ServerSplash({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const check = async () => {
      try {
        await api.get("/health", { timeout: 10000 });
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) timer = window.setTimeout(check, 2000);
      }
    };

    check();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (ready) return children;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#fffaf0" }}>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 64 }}>🧸</div>
        <h1 style={{ margin: "16px 0 6px", fontSize: 30, fontWeight: 900 }}>JD COLLECTION</h1>
        <p style={{ margin: 0, color: "#64748b" }}>Starting JD COLLECTION...</p>
        <div style={{ height: 8, marginTop: 24, overflow: "hidden", borderRadius: 9999, background: "#e2e8f0" }}>
          <div style={{ width: "40%", height: "100%", borderRadius: 9999, background: "#ffd84d", animation: "jd-collection-loading 1.2s ease-in-out infinite" }} />
        </div>
        <p style={{ marginTop: 12, fontSize: 13, color: "#94a3b8" }}>Connecting to the server...</p>
        <style>{`@keyframes jd-collection-loading { 0% { transform: translateX(-120%); } 50% { transform: translateX(130%); } 100% { transform: translateX(280%); } }`}</style>
      </div>
    </div>
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ServerSplash>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ServerSplash>
  </React.StrictMode>
);
