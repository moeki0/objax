import { MutableRefObject, useEffect } from "react";

import { Thing, getThing } from "@/lib/objax";
import { useRouter } from "next/navigation";

type Params = {
  initialWorldUrl?: string;
  worldId: string | null;
  setWorldId: (id: string | null) => void;
  setThings: (things: Thing[]) => void;
  lastSavedSnapshotRef: MutableRefObject<Map<string, string>>;
};

export function useWorldLoading({
  initialWorldUrl,
  worldId,
  setWorldId,
  setThings,
  lastSavedSnapshotRef,
}: Params) {
  const router = useRouter();

  const reloadFromGlobal = async (wid: string | null) => {
    if (!wid) return;
    try {
      const res = await fetch(
        `/api/objects?worldId=${encodeURIComponent(wid)}&limit=1000`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const incoming = data.things ?? [];
      setThings(incoming);
      const m = new Map<string, string>();
      for (const t of incoming) {
        if (!t?.id) continue;
        const snapshot = JSON.stringify({
          code: String(t.code ?? ""),
          x: (t as any)?.x ?? 0,
          y: (t as any)?.y ?? 0,
          width: (t as any)?.width ?? 200,
          height: (t as any)?.height ?? 200,
        });
        m.set(t.id as string, snapshot);
      }
      lastSavedSnapshotRef.current = m;
    } catch {}
  };

  // Resolve world by URL when provided
  useEffect(() => {
    let cancelled = false;
    const loadFromUrl = async () => {
      if (!initialWorldUrl) return;
      try {
        const r = await fetch(
          `/api/worlds/${encodeURIComponent(initialWorldUrl)}`,
          { cache: "no-store" }
        );
        if (!r.ok) return;
        const dj = await r.json();
        const w = dj?.world;
        if (!cancelled) {
          if (w?.id) setWorldId(w.id);
          else router.push("/worlds");
        }
      } catch {}
    };
    loadFromUrl();
    return () => {
      cancelled = true;
    };
  }, [initialWorldUrl, router, setWorldId]);

  // Load things whenever world changes
  useEffect(() => {
    reloadFromGlobal(worldId);
  }, [worldId]);

  return { reloadFromGlobal };
}
