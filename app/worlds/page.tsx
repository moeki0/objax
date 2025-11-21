"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";

type World = { id: string; name: string; url?: string | null };

export default function WorldsPage() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/worlds?limit=1000", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setWorlds(Array.isArray(data.worlds) ? data.worlds : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-2 border-b border-gray-200 bg-gray-50 flex items-center">
        <h1 className="font-bold">Objax</h1>
        <div className="grow"></div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          type="button"
        >
          Log out
        </button>
      </header>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Select a World</h1>
          <button
            className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-gray-50 hover:bg-gray-100"
            onClick={async () => {
              const name = prompt("World name?")?.trim();
              if (!name) return;
              try {
                const res = await fetch("/api/worlds", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  const data = await res.json();
                  const w: World = data.world;
                  setWorlds((prev) => [w, ...prev]);
                  if (w?.url)
                    router.push(`/w/${encodeURIComponent(String(w.url))}`);
                }
              } catch {}
            }}
          >
            + New World
          </button>
        </div>

        <div className="border border-gray-200 rounded">
          <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            <div className="col-span-6 px-3 py-2">Name</div>
          </div>
          <div>
            {loading && (
              <div className="px-3 py-4 text-sm text-gray-500">Loading…</div>
            )}
            {!loading && worlds.length === 0 && (
              <div className="px-3 py-6 text-sm text-gray-500">
                No worlds yet. Create one to get started.
              </div>
            )}
            {worlds.map((w) => (
              <div
                key={w.id}
                className="grid grid-cols-12 items-center border-t border-gray-100 hover:bg-gray-50"
              >
                <button
                  className="col-span-10 text-left px-3 py-2 truncate hover:underline"
                  onClick={() => {
                    if (w?.url)
                      router.push(`/w/${encodeURIComponent(String(w.url))}`);
                  }}
                >
                  {w.name || w.id}
                </button>
                <div className="col-span-2 px-3 py-2 text-right">
                  <button
                    className="text-xs"
                    onClick={async () => {
                      const name = prompt("Rename world", w.name || "");
                      if (name == null) return;
                      const next = name.trim();
                      if (!next) return;
                      try {
                        const res = await fetch("/api/worlds", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: w.id, name: next }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          const nw = data.world as World;
                          setWorlds((prev) =>
                            prev.map((x) => (x.id === w.id ? nw : x))
                          );
                        }
                      } catch {}
                    }}
                  >
                    Rename
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
