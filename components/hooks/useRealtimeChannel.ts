import { MutableRefObject, useEffect } from "react";

import { Thing } from "@/lib/objax";
import { getAblyClient } from "@/lib/ably/client";

type Params = {
  worldId: string | null;
  setThings: (things: Thing[]) => void;
  lastSavedSnapshotRef: MutableRefObject<Map<string, string>>;
};

export function useRealtimeChannel({
  worldId,
  setThings,
  lastSavedSnapshotRef,
}: Params) {
  useEffect(() => {
    if (!worldId) return;
    try {
      const client = getAblyClient();
      const ch = client.channels.get(`things:${worldId || "default"}`);
      const handler = (msg: any) => {
        if (msg?.data?.sourceConnectionId === (client.connection as any)?.id) {
          return;
        }
        const upserts = msg?.data?.upserts as Thing[] | undefined;
        const deletes = msg?.data?.deletes as string[] | undefined;
        if (!Array.isArray(upserts) || !Array.isArray(deletes)) {
          return;
        }
        setThings((prev) => {
          const cur = new Map<string, Thing>();
          for (const t of prev) cur.set(t.id!, t);
          for (const up of upserts) {
            if (!up?.id) continue;
            cur.set(up.id, { ...(cur.get(up.id) || {}), ...up });
          }
          for (const d of deletes) cur.delete(String(d));
          return Array.from(cur.values());
        });
        // Update snapshot cache to avoid redundant interval writes
        const cur = new Map(lastSavedSnapshotRef.current);
        for (const u of upserts) {
          const snap = JSON.stringify({
            code: String(u.code ?? ""),
            x: u.x ?? 0,
            y: u.y ?? 0,
            width: u.width ?? 200,
            height: u.height ?? 200,
          });
          cur.set(String(u.id), snap);
        }
        for (const id of deletes) cur.delete(String(id));
        lastSavedSnapshotRef.current = cur;
      };
      ch.subscribe("update", handler);
      return () => {
        try {
          ch.unsubscribe("update", handler);
          const state = (ch as any).state as string | undefined;
          if (state === "attached" || state === "attaching") {
            ch.detach().finally(() => {
              try {
                client.channels.release(`things:${worldId || "default"}`);
              } catch {}
            });
          } else {
            client.channels.release(`things:${worldId || "default"}`);
          }
        } catch {}
      };
    } catch {}
  }, [lastSavedSnapshotRef, setThings, worldId]);
}
