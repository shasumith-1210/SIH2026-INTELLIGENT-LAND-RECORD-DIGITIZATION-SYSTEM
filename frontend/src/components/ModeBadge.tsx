import { useEffect, useState } from "react";
import { api } from "../services/api";

/** Always-visible indicator of whether the app talks to the real backend or runs on sample data. */
export default function ModeBadge() {
  const [up, setUp] = useState<boolean | null>(null);
  useEffect(() => {
    if (!api.enabled) return;
    const check = () => api.health().then(setUp);
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);
  const cls = !api.enabled ? "bg-amber-100 text-amber-800 border-amber-300" : up === false ? "bg-red-100 text-red-800 border-red-300" : "bg-green-100 text-green-800 border-green-300";
  const text = !api.enabled ? "DEMO MODE: sample data, no backend, login is not enforced" : up === null ? "Checking backend…" : up ? "Backend connected: login enforced" : "Backend unreachable";
  return <div data-testid="mode-badge" className={`fixed bottom-3 left-3 z-50 text-xs font-semibold px-3 py-1.5 rounded-full border shadow-sm ${cls}`}>{text}</div>;
}
