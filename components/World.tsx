/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThingComponent } from "./Thing";
import { useWorld } from "./hooks/useWorld";
import { useHotkeys } from "react-hotkeys-hook";
import { useDebouncedCallback } from "use-debounce";
import { World } from "@/lib/objax/runtime/world";
import { Footer } from "./Footer";
import { getAblyClient } from "@/lib/ably/client";
import { load } from "@/lib/objax/runtime/load";

export function WorldComponent() {
  const [init, setInit] = useState<World | null>(null);
  const channelRef = useRef<any>(null);
  const connIdRef = useRef<string | null>(null);
  const lastSnapshotRef = useRef<Map<string, string>>(new Map());
  const liveBufferRef = useRef<Map<string, any>>(new Map());
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const runtime = useWorld({ init });
  useHotkeys("ctrl+n", () => runtime?.add({}));
  const publishRealtime = useCallback(
    async ({
      upserts = [] as any[],
      deletes = [] as string[],
    }: { upserts?: any[]; deletes?: string[] } = {}) => {
      try {
        const ch = channelRef.current;
        if (!ch) return;
        await ch.publish("update", {
          upserts,
          deletes,
          sourceConnectionId: connIdRef.current,
        });
      } catch (err) {
        console.error("[ably] publish failed", err);
      }
    },
    []
  );

  const func = useDebouncedCallback(() => {
    if (!runtime) return;
    const upserts: any[] = [];
    const currentIds = new Set<string>();
    for (const t of runtime.world.things) {
      if (!t?.id) continue;
      currentIds.add(t.id);
      const snap = JSON.stringify(t);
      const prev = lastSnapshotRef.current.get(t.id);
      if (prev !== snap) {
        upserts.push(t);
        lastSnapshotRef.current.set(t.id, snap);
      }
    }
    const deleteIds: string[] = [];
    for (const id of Array.from(lastSnapshotRef.current.keys())) {
      if (!currentIds.has(id)) {
        deleteIds.push(id);
        lastSnapshotRef.current.delete(id);
      }
    }
    if (!upserts.length && !deleteIds.length) return;
    const save = async () => {
      try {
        await publishRealtime({ upserts, deletes: deleteIds });
        await fetch("/api/things", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upserts, deletes: deleteIds }),
        });
      } catch (e) {
        console.error(e);
      }
    };
    save();
  }, 50);

  const sendLiveUpdate = useCallback(
    (payload: any) => {
      if (!payload?.id) return;
      liveBufferRef.current.set(payload.id, payload);
      if (liveTimerRef.current) return;
      liveTimerRef.current = setTimeout(async () => {
        const batch = Array.from(liveBufferRef.current.values());
        liveBufferRef.current.clear();
        liveTimerRef.current = null;
        if (!batch.length) return;
        try {
          await publishRealtime({ upserts: batch, deletes: [] });
        } catch (err) {
          console.error("[ably] publish failed", err);
        }
      }, 50); // throttle to avoid rate limit
    },
    [publishRealtime]
  );

  useEffect(() => {
    const request = async () => {
      const res = await fetch(`/api/things`);
      const data = await res.json();
      setInit({
        things: data.things,
      });
      const snap = new Map<string, string>();
      for (const t of data.things || []) {
        if (t?.id) snap.set(t.id, JSON.stringify(t));
      }
      lastSnapshotRef.current = snap;
    };
    request();
  }, [setInit]);

  const world = runtime?.world;

  useEffect(func, [world?.things, func]);

  useEffect(() => {
    if (!runtime) return;
    let mounted = true;
    let channel: any = null;

    const subscribe = async () => {
      try {
        const client = getAblyClient();
        client.connection.once("connected", () => {
          connIdRef.current = (client.connection as any)?.id ?? null;
        });
        channel = client.channels.get("things:default");
        channelRef.current = channel;
        channel.subscribe("update", (msg: any) => {
          if (!mounted || !runtime) return;
          const data = (msg?.data as any) || {};
          const fromConn = (data as any)?.sourceConnectionId ?? null;
          if (fromConn && fromConn === connIdRef.current) {
            return; // 自分が送ったイベントはスキップ
          }
          const upserts: any[] = Array.isArray(data.upserts)
            ? data.upserts
            : [];
          const deleteIds: string[] = Array.isArray(data.deletes)
            ? data.deletes.filter((id: any) => typeof id === "string")
            : [];

          const next = runtime.world.things
            .filter((t) => !deleteIds.includes(t.id))
            .map((t) => ({ ...t }));

          for (const raw of upserts) {
            const id = (raw as any)?.id;
            if (!id || typeof id !== "string") continue;
            const existingIdx = next.findIndex((t) => t.id === id);
            const existing = existingIdx >= 0 ? next[existingIdx] : null;
            const code = String((raw as any)?.code ?? existing?.code ?? "");
            const loaded = load(code);
            const merged = {
              id,
              code,
              ...(existing ?? {}),
              ...(raw as any),
              ...loaded,
            };
            if (existingIdx >= 0) {
              next[existingIdx] = merged;
            } else {
              next.push(merged as any);
            }
          }

          runtime.world.things = next;

          const snap = new Map<string, string>();
          for (const t of next) {
            if (t?.id) snap.set(t.id, JSON.stringify(t));
          }
          lastSnapshotRef.current = snap;
        });
      } catch (err) {
        console.error("[ably] subscribe failed", err);
      }
    };

    subscribe();

    return () => {
      mounted = false;
      try {
        if (channel) channel.unsubscribe();
      } catch {}
    };
  }, [runtime]);

  if (!world) {
    return;
  }

  return (
    <div>
      {world.things.map((thing) => (
        <ThingComponent
          key={thing.id}
          thing={thing}
          things={world.things}
          runtime={runtime}
          onLiveUpdate={sendLiveUpdate}
        />
      ))}
      <Footer />
    </div>
  );
}
