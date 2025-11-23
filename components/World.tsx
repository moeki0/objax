/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import Fuse from "fuse.js";
import { FiSettings } from "react-icons/fi";

const VIEW_SIZE = 5000;
const WORLD_SIZE = VIEW_SIZE;
export const WORLD_OFFSET = WORLD_SIZE / 2;
const SHIFT_STEP = 2000;
const EDGE_THRESHOLD = 400;

export function WorldComponent() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [init, setInit] = useState<World | null>(null);
  const channelRef = useRef<any>(null);
  const connIdRef = useRef<string | null>(null);
  const lastSnapshotRef = useRef<Map<string, string>>(new Map());
  const liveBufferRef = useRef<Map<string, any>>(new Map());
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const runtime = useWorld({ init });
  const renderOffset = {
    x: offset.x,
    y: offset.y,
  };
  useHotkeys("ctrl+n", () => {
    const el = scrollRef.current;
    if (runtime && el) {
      const x =
        el.scrollLeft +
        window.innerWidth / 2 +
        renderOffset.x -
        50 -
        WORLD_OFFSET;
      const y =
        el.scrollTop +
        window.innerHeight / 2 +
        renderOffset.y -
        50 -
        WORLD_OFFSET;
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

  const shiftViewportIfNeeded = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearLeft = el.scrollLeft < EDGE_THRESHOLD;
    const nearRight =
      el.scrollLeft > el.scrollWidth - el.clientWidth - EDGE_THRESHOLD;
    const nearTop = el.scrollTop < EDGE_THRESHOLD;
    const nearBottom =
      el.scrollTop > el.scrollHeight - el.clientHeight - EDGE_THRESHOLD;

    let dx = 0;
    let dy = 0;
    if (nearLeft) dx = -SHIFT_STEP;
    else if (nearRight) dx = SHIFT_STEP;
    if (nearTop) dy = -SHIFT_STEP;
    else if (nearBottom) dy = SHIFT_STEP;

    if (dx !== 0 || dy !== 0) {
      setOffset((prev) => {
        return { x: prev.x + dx * 2, y: prev.y + dy * 2 };
      });
      requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        const el2 = scrollRef.current;
        const maxX =
          dx === 0
            ? el.scrollLeft
            : dx < 0
            ? el.scrollWidth - EDGE_THRESHOLD - el.clientWidth
            : EDGE_THRESHOLD;
        const maxY =
          dy === 0
            ? el.scrollTop
            : dy < 0
            ? el.scrollHeight - EDGE_THRESHOLD - el.clientHeight
            : EDGE_THRESHOLD;
        el2.scrollTo({
          left: maxX,
          top: maxY,
        });
      });
    }
  }, [offset]);

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
      const e = getValue(
        world?.things ?? [],
        getField(world?.things ?? [], target.name, name)?.value as any
      );
      return e;
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
      left: el.scrollLeft - renderOffset.x - buffer - WORLD_OFFSET,
      right:
        el.scrollLeft - renderOffset.x + el.clientWidth + buffer - WORLD_OFFSET,
      top: el.scrollTop - renderOffset.y - buffer - WORLD_OFFSET,
      bottom:
        el.scrollTop - renderOffset.y + el.clientHeight + buffer - WORLD_OFFSET,
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

  const worldWidth = WORLD_SIZE;
  const worldHeight = WORLD_SIZE;

  const fuse = useMemo(() => {
    if (!world?.things) return null;
    return new Fuse(world.things, {
      keys: ["name"],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [world?.things]);

  const searchResults = useMemo(() => {
    if (!fuse) return [];
    const q = search.trim();
    if (!q) {
      setHighlightId(null);
      return [];
    }
    const r = fuse
      .search(q)
      .slice(0, 10)
      .map((r) => r.item);
    return r;
  }, [fuse, search]);

  const scrollToThing = useCallback(
    (thing: Thing) => {
      const el = scrollRef.current;
      if (!el) return;
      const layout = layouts.byId.get(thing.id);
      const fallbackX =
        Number(
          getValue(
            world?.things ?? [],
            getField(world?.things ?? [], thing.name, "x")?.value as any
          )
        ) ?? 0;
      const fallbackY =
        Number(
          getValue(
            world?.things ?? [],
            getField(world?.things ?? [], thing.name, "y")?.value as any
          )
        ) ?? 0;
      const x = layout?.x ?? fallbackX;
      const y = layout?.y ?? fallbackY;
      const width = layout?.width ?? 100;
      const height = layout?.height ?? 100;
      const targetX = x + renderOffset.x + width / 2 - el.clientWidth / 2;
      const targetY = y + renderOffset.y + height / 2 - el.clientHeight / 2;
      el.scrollTo({ left: targetX, top: targetY, behavior: "smooth" });
      setHighlightId(thing.id);
    },
    [layouts, world?.things, renderOffset.x, renderOffset.y]
  );

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
    <>
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-1000 px-3 py-2 space-y-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full border border-gray-300 rounded-full bg-white px-4 min-w-80 py-2 text-sm outline-none focus:border-blue-500"
        />
        {searchResults.length > 0 && (
          <div className="max-h-64 overflow-auto bg-white border border-gray-200 shadow rounded divide-y divide-gray-100">
            {searchResults.map((thing) => (
              <button
                key={thing.id}
                onClick={() => scrollToThing(thing)}
                className="w-full text-left px-2 py-1 text-sm hover:bg-blue-50"
              >
                {thing.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="fixed top-4 right-4 z-1000">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-full hover:bg-gray-100 px-3 py-3 text-sm  transition-colors"
        >
          <FiSettings />
        </Link>
      </div>
      <div
        ref={scrollRef}
        className="scroller w-screen h-screen overflow-auto bg-white"
        onScroll={shiftViewportIfNeeded}
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
              worldOffset={renderOffset}
              highlighted={highlightId === thing.id}
            />
          ))}
        </div>
        <Footer worldOffset={renderOffset} />
      </div>
    </>
  );
}
