/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThingComponent } from "./Thing";
import { useWorld } from "./hooks/useWorld";
import { useHotkeys } from "react-hotkeys-hook";
import { useDebouncedCallback } from "use-debounce";
import { World } from "@/lib/objax/runtime/world";
import { Footer } from "./Footer";
import { getAblyClient } from "@/lib/ably/client";
import { load } from "@/lib/objax/runtime/load";
import { getField } from "@/lib/objax/runtime/get-field";
import { getValue } from "@/lib/objax/runtime/get-value";
import { useThingLayouts } from "./thing/layout";
import { Thing } from "@/lib/objax/type";
import { useVirtualizer } from "@tanstack/react-virtual";

const WORLD_SIZE = 100000;
const WORLD_OFFSET = WORLD_SIZE / 2;

export function WorldComponent() {
  const [init, setInit] = useState<World | null>(null);
  const channelRef = useRef<any>(null);
  const connIdRef = useRef<string | null>(null);
  const lastSnapshotRef = useRef<Map<string, string>>(new Map());
  const liveBufferRef = useRef<Map<string, any>>(new Map());
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const runtime = useWorld({ init });
  useHotkeys("ctrl+n", () => {
    const el = scrollRef.current;
    if (runtime && el) {
      const x = el.scrollLeft + window.innerWidth / 2 - 50000 - 50;
      const y = el.scrollTop + window.innerHeight / 2 - 50000 - 50;
      console.log(x);
      runtime.add({ input: { x, y } });
    } else {
      runtime?.add({});
    }
  });
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
        width: WORLD_SIZE,
        height: WORLD_SIZE,
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

  const fieldValue = useCallback(
    (target: Thing, name: string) => {
      return getValue(
        world?.things ?? [],
        getField(world?.things ?? [], target.name, name)?.value as any
      );
    },
    [world?.things]
  );

  const layouts = useThingLayouts({
    things: world?.things ?? [],
    fieldValue,
  });

  const visibleIndices = useCallback(() => {
    if (!world) return [];
    const el = scrollRef.current;
    if (!el) return world.things.map((_, i) => i);
    const buffer = 800; // 少し余裕を持って先読み
    const view = {
      left: el.scrollLeft - WORLD_OFFSET - buffer,
      right: el.scrollLeft - WORLD_OFFSET + el.clientWidth + buffer,
      top: el.scrollTop - WORLD_OFFSET - buffer,
      bottom: el.scrollTop - WORLD_OFFSET + el.clientHeight + buffer,
    };
    return world.things.reduce((acc: number[], thing, idx) => {
      const layout = layouts.byId.get(thing.id);
      if (!layout) {
        acc.push(idx);
        return acc;
      }
      const horizontal =
        layout.x + layout.width >= view.left && layout.x <= view.right;
      const vertical =
        layout.y + layout.height >= view.top && layout.y <= view.bottom;
      if (horizontal && vertical) acc.push(idx);
      return acc;
    }, []);
  }, [world, layouts]);

  const virtualizer = useVirtualizer({
    count: world?.things.length ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 10,
    rangeExtractor: () => visibleIndices(),
  });

  const virtualItems = virtualizer.getVirtualItems();
  const visibleThings = useMemo(() => {
    if (!world) return [];
    return virtualItems.map((item) => world.things[item.index]).filter(Boolean);
  }, [virtualItems, world]);

  const worldWidth = world?.width ?? WORLD_SIZE;
  const worldHeight = world?.height ?? WORLD_SIZE;

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !world) return;
    const centerX = WORLD_OFFSET - el.clientWidth / 2;
    const centerY = WORLD_OFFSET - el.clientHeight / 2;
    el.scrollTo({ left: centerX, top: centerY, behavior: "auto" });
  }, [world]);

  if (!world) {
    return;
  }

  return (
    <div
      ref={scrollRef}
      className="scroller w-screen h-screen overflow-auto bg-white"
    >
      <div
        className="relative"
        style={{
          width: worldWidth,
          height: worldHeight,
          minWidth: worldWidth,
          minHeight: worldHeight,
        }}
      >
        {visibleThings.map((thing) => (
          <ThingComponent
            key={thing.id}
            thing={thing}
            things={world.things}
            runtime={runtime}
            onLiveUpdate={sendLiveUpdate}
            layoutMaps={layouts}
            scrollContainer={scrollRef.current}
            worldOffset={WORLD_OFFSET}
          />
        ))}
      </div>
      <Footer />
    </div>
  );
}
