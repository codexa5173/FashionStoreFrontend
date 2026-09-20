import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const COOLDOWN_MS = 3000;

export default function RefreshButton({ onClick, busy = false }) {
  const [cooldown, setCooldown] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleClick() {
    if (busy || cooldown) return;
    setCooldown(true);
    try {
      await onClick?.();
    } finally {
      timer.current = window.setTimeout(() => setCooldown(false), COOLDOWN_MS);
    }
  }

  const disabled = busy || cooldown;
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="btn-soft shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
      title={disabled ? "Please wait a few seconds before refreshing again" : "Refresh from server"}
    >
      <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
      <span>{busy ? "Refreshing..." : cooldown ? "Please wait..." : "Refresh"}</span>
    </button>
  );
}
