"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRIAL_WORLD_URL = "";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateWorld = async () => {
    const name = prompt(
      "Enter world name\n\nNote: Anyone who knows the URL can view this world."
    )?.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/worlds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setError("Failed to create world");
        return;
      }
      const data = await res.json();
      const w = data.world;
      if (w?.url) router.push(`/w/${encodeURIComponent(String(w.url))}`);
    } catch (e) {
      setError("Failed to create world");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-3xl font-bold">Objax</h1>
        <div className="space-y-4">
          <button
            className="w-full px-4 py-3 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 text-sm"
            disabled={!TRIAL_WORLD_URL}
            onClick={() => {
              if (!TRIAL_WORLD_URL) {
                alert("Set the trial world URL first.");
                return;
              }
              router.push(TRIAL_WORLD_URL);
            }}
          >
            Go to Trial World
          </button>
          <button
            className="w-full px-4 py-3 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm disabled:opacity-60"
            onClick={handleCreateWorld}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create World"}
          </button>
          <a
            className="inline-block w-full px-4 py-3 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm text-center"
            href="/login"
          >
            Login
          </a>
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
