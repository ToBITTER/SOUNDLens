"use client";

import { useState } from "react";

export function SyncNowButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus(null);

    try {
      const response = await fetch("/api/sync-now", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      setStatus("Synced successfully");
    } catch (error) {
      setStatus("Unable to sync right now.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSyncing ? "Syncing..." : "Sync Now"}
      </button>
      {status ? <p className="text-xs text-white/70">{status}</p> : null}
    </div>
  );
}
