"use client";

import { useState } from "react";

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setStatus(null);

    try {
      const response = await fetch("/api/sync-now", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Refresh failed");
      }

      setStatus("Dashboard refreshed");
    } catch (error) {
      setStatus("Unable to refresh right now.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
      {status ? <p className="text-xs text-white/70">{status}</p> : null}
    </div>
  );
}
