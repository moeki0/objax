/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { MouseEventHandler, useEffect, useRef, useState } from "react";
import { ThingComponent } from "./Thing";
import { getThing, Thing } from "@/lib/objax";
import TextareaAutosize from "react-textarea-autosize";
import { ThingList } from "./ThingList";
import { FiMenu } from "react-icons/fi";
import { getAblyClient } from "@/lib/ably/client";

export function Canvas() {
  const [selected, setSelected] = useState<Thing | null>(null);
  const [things, setThings] = useState<Thing[]>([]);
  const latestThingsRef = useRef<Thing[]>(things);
  latestThingsRef.current = things;
  const lastSavedSnapshotRef = useRef<Map<string, string>>(new Map());
  const [editing, setEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  // Debounce timers for code saves per Thing id
  const saveTimersRef = useRef<Map<string, any>>(new Map());

  const scheduleCodeSave = (id: string, delay = 600) => {
    const timers = saveTimersRef.current;
    if (timers.has(id)) {
      clearTimeout(timers.get(id));
    }
    const handle = setTimeout(() => {
      const t = latestThingsRef.current.find((tt) => tt.id === id);
      if (!t) return;
      // Skip if snapshot unchanged
      const prev = lastSavedSnapshotRef.current.get(id);
      const snapStr = JSON.stringify({
        code: String(t.code ?? ""),
        x: t.x ?? 0,
        y: t.y ?? 0,
        width: t.width ?? 200,
        height: t.height ?? 200,
      });
      if (prev === snapStr) return;
      postObjects({
        upserts: [
          {
            id,
            code: String(t.code ?? ""),
            x: t.x ?? 0,
            y: t.y ?? 0,
            width: t.width ?? 200,
            height: t.height ?? 200,
          },
        ],
      });
    }, delay);
    timers.set(id, handle);
  };

  const flushCodeSave = (id: string) => {
    const timers = saveTimersRef.current;
    if (timers.has(id)) {
      clearTimeout(timers.get(id));
      timers.delete(id);
    }
    scheduleCodeSave(id, 0);
  };
  const postObjects = async ({
    upserts = [] as Array<{ id: string; code?: string; x?: number; y?: number; width?: number; height?: number }>,
    deletes = [] as string[],
  }) => {
    if (upserts.length === 0 && deletes.length === 0) return;
    try {
      const connId = (() => {
        try {
          const c = getAblyClient();
          return (c.connection as any)?.id as string | undefined;
        } catch {
          return undefined;
        }
      })();
      const res = await fetch("/api/objects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ upserts, deletes, sourceConnectionId: connId }),
      });
      if (res.ok) {
        // Update local snapshot cache to avoid redundant interval writes
        const cur = new Map(lastSavedSnapshotRef.current);
        for (const u of upserts) {
          const t = latestThingsRef.current.find((tt) => tt.id === u.id);
          const snap = JSON.stringify({
            code: String(u.code ?? t?.code ?? ""),
            x: u.x ?? (t?.x ?? 0),
            y: u.y ?? (t?.y ?? 0),
            width: u.width ?? (t?.width ?? 200),
            height: u.height ?? (t?.height ?? 200),
          });
          cur.set(u.id, snap);
        }
        for (const id of deletes) cur.delete(id);
        lastSavedSnapshotRef.current = cur;
      }
    } catch {}
  };
  const handleAdd = () => {
    const left = scrollRef.current?.scrollLeft ?? 0;
    const top = scrollRef.current?.scrollTop ?? 0;
    const id = Math.random().toString(32).substring(2);
    setThings((c) => [
      ...c,
      {
        id,
        name: "",
        x: left,
        text: { type: "Text" as const, value: { type: "String", value: "" } },
        y: top,
        width: 100,
        height: 100,
        code: `name is`,
        sticky: undefined,
        eventActions: [],
        transitions: [],
        fields: [],
        imagePrompt: "",
      },
    ]);
    // Persist immediately so others see it
    postObjects({
      upserts: [
        {
          id,
          code: "name is",
          x: left,
          y: top,
          width: 100,
          height: 100,
        },
      ],
    });
  };
  const handleDelete = () => {
    if (!selected) return;
    setThings((prev) => prev.filter((p) => p.id !== selected.id));
    setSelected(null);
    // Persist deletion
    postObjects({ deletes: [selected.id!] });
  };
  const handleChangeCode = (
    values: (string | undefined)[],
    ids: (string | undefined)[]
  ) => {
    setThings((prev) => {
      return prev.map((p) => {
        if (ids.includes(p.id!)) {
          const code = values[ids.findIndex((i) => i === p.id!)]!;
          let result;
          try {
            result = getThing(code);
          } catch (e) {
            console.log(e);
          }
          if (!result) {
            return { ...p, code };
          }
          const dup = result.duplicate;
          if (dup) {
            const target = things.find((t) => t.name === dup.name.name);
            return {
              ...target,
              duplicate: p.duplicate,
              code,
              name: result.name,
              id: p.id,
              x: p.x,
              y: p.y,
              width: p.width,
              height: p.height,
              eventActions: result.eventActions,
            };
          }
          const image = result.fields?.find((f) => f.name.name === "image");
          return {
            ...p,
            code,
            name: result.name,
            sticky: result.sticky,
            fields: result.fields,
            transitions: result.transitions,
            eventActions: result.eventActions,
            image,
          };
        }
        return p;
      });
    });
    // Debounce save for target ids
    ids.forEach((id) => id && scheduleCodeSave(id));
  };
  const target = things.find((t) => t.id === selected?.id);

  // Build a Thing from global code + personal state overlay
  const buildFromGlobal = (g: Partial<Thing>): Thing => {
    const id = g.id as string;
    const code = g.code || "";
    let parsed;
    try {
      parsed = getThing(code);
    } catch {
      parsed = {
        name: "",
        fields: [],
        transitions: [],
        eventActions: [],
        sticky: undefined,
      } as any;
    }
    const base: Thing = {
      id,
      code,
      name: parsed.name,
      sticky: parsed.sticky,
      eventActions: parsed.eventActions,
      transitions: parsed.transitions,
      fields: parsed.fields,
      width: (g as any)?.width ?? 200,
      height: (g as any)?.height ?? 200,
      x: (g as any)?.x ?? 0,
      y: (g as any)?.y ?? 0,
    };
    return base;
  };

  // Load globals and merge with personal state
  const reloadFromGlobal = async () => {
    try {
      const res = await fetch("/api/objects?limit=500", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const incoming = Array.isArray(data?.things)
        ? (data.things as Partial<Thing>[])
        : [];
      const view = incoming
        .filter((t) => t?.id && typeof t.id === "string")
        .map((t) => buildFromGlobal(t));
      setThings(view);
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

  // Initial load: merge global with personal
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await reloadFromGlobal();
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Center the viewport on the 100000x100000 canvas at mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Wait a tick to ensure layout
    requestAnimationFrame(() => {
      const left = Math.max(0, 100000 / 2 - el.clientWidth / 2);
      const top = Math.max(0, 100000 / 2 - el.clientHeight / 2);
      el.scrollLeft = left;
      el.scrollTop = top;
      setScrollPos({ left, top });
    });
  }, []);

  // Removed periodic auto-save to avoid race conflicts while dragging.

  // Realtime updates via Ably: apply update payload without full reload
  useEffect(() => {
    try {
      const client = getAblyClient();
      const ch = client.channels.get("things");
      const handler = (msg: any) => {
        const data = msg?.data || {};
        // Ignore our own updates to prevent transient flicker
        try {
          const clientConnId = (client.connection as any)?.id as string | undefined;
          if (clientConnId && data?.sourceConnectionId === clientConnId) return;
        } catch {}
        const upserts = Array.isArray(data?.upserts) ? data.upserts : [];
        const deletes = Array.isArray(data?.deletes) ? data.deletes : [];
        if (upserts.length === 0 && deletes.length === 0) return;
        setThings((prev) => {
          let next = prev.filter((t) => !deletes.includes(t.id!));
          const incoming: Partial<Thing>[] = upserts
            .filter((u: any) => u?.id)
            .map((u: any) => ({
              id: String(u.id),
              code: String(u.code ?? ""),
              x: typeof u.x === "number" ? u.x : undefined,
              y: typeof u.y === "number" ? u.y : undefined,
              width: typeof u.width === "number" ? u.width : undefined,
              height: typeof u.height === "number" ? u.height : undefined,
            }));
          const built = incoming.map((g) => buildFromGlobal(g));
          for (const b of built) {
            const idx = next.findIndex((t) => t.id === b.id);
            if (idx >= 0) next = [...next.slice(0, idx), b, ...next.slice(idx + 1)];
            else next = [...next, b];
          }
          return next;
        });
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
            // Detach before releasing to satisfy Ably requirements
            ch.detach().finally(() => {
              try {
                client.channels.release("things");
              } catch {}
            });
          } else {
            client.channels.release("things");
          }
        } catch {}
      };
    } catch {}
  }, []);

  const [windowPos, setWindowPos] = useState({ x: 10, y: 10 });
  const [windowSize, setWindowSize] = useState({ width: 400, height: 300 });
  const [isResizing, setIsResizing] = useState(false);
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [clickedPos, setClickedPos] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
    setIsDragging(true);
    setClickedPos({
      x: e.clientX - e.currentTarget.getBoundingClientRect().x,
      y: e.clientY - e.currentTarget.getBoundingClientRect().y,
    });
  };
  const handleResizeMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.pageX, y: e.pageY });
    setInitialSize({ width: windowSize.width, height: windowSize.height });
  };
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
      if (isResizing) setIsResizing(false);
    };
    const handleDrag = (e: MouseEvent) => {
      if (isDragging) {
        const x = e.pageX - clickedPos.x;
        const y = e.pageY - clickedPos.y;
        setWindowPos({ x, y });
      } else if (isResizing) {
        const dx = e.pageX - resizeStart.x;
        const dy = e.pageY - resizeStart.y;
        const width = Math.max(32, initialSize.width + dx);
        const height = Math.max(32, initialSize.height + dy);
        setWindowSize({ width, height });
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleDrag);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleDrag);
    };
  }, [
    clickedPos.x,
    clickedPos.y,
    initialSize.height,
    initialSize.width,
    isDragging,
    isResizing,
    resizeStart.x,
    resizeStart.y,
  ]);

  const bgRef = useRef<HTMLDivElement>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  // no file import/export in global mode

  const getAbsolutePos = (
    t: Thing,
    seen = new Set<string>()
  ): {
    x: number;
    y: number;
  } => {
    const cur = latestThingsRef.current;
    const self = cur.find((tt) => tt.id === t.id) ?? t;
    const x = self.x ?? 0;
    const y = self.y ?? 0;
    if (!self.sticky) return { x, y };
    if (seen.has(self.name)) return { x, y };
    seen.add(self.name);
    const parent = cur.find((tt) => tt.name === self.sticky);
    if (!parent) return { x, y };
    const p = getAbsolutePos(parent, seen);
    return { x: p.x + x, y: p.y + y };
  };

  const centerOnThing = (t: Thing) => {
    const sc = scrollRef.current;
    if (!sc) return;
    const vpW = sc.clientWidth;
    const vpH = sc.clientHeight;
    const pos = getAbsolutePos(t);
    const w = t.width ?? 200;
    const h = t.height ?? 200;
    const targetLeft = Math.max(0, pos.x + w / 2 - vpW / 2);
    const targetTop = Math.max(0, pos.y + h / 2 - vpH / 2);
    sc.scrollTo({ left: targetLeft, top: targetTop, behavior: "smooth" });
  };

  return (
    <div className="w-screen h-screen relative">
      <div
        ref={scrollRef}
        className="w-screen h-screen bg-white overflow-scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (
            scrollPos.left !== el.scrollLeft ||
            scrollPos.top !== el.scrollTop
          ) {
            setScrollPos({ left: el.scrollLeft, top: el.scrollTop });
          }
        }}
        onClick={(e) => {
          if (e.metaKey) {
            setIsWindowOpen(!isWindowOpen);
          }
        }}
      >
        <div
          className="relative overflow-visible"
          ref={bgRef}
          style={{ width: 100000, height: 100000 }}
        >
          {things.map((thing) => (
            <ThingComponent
              things={things}
              key={thing.id}
              selected={selected}
              setThings={setThings}
              thing={thing}
              setSelected={setSelected}
              editing={editing}
              scrollLeft={scrollPos.left}
              scrollTop={scrollPos.top}
              onGeometryCommit={(id) => {
                const t = latestThingsRef.current.find((tt) => tt.id === id);
                if (!t) return;
                postObjects({
                  upserts: [
                    {
                      id: id!,
                      code: String(t.code ?? ""),
                      x: t.x ?? 0,
                      y: t.y ?? 0,
                      width: t.width ?? 200,
                      height: t.height ?? 200,
                    },
                  ],
                });
              }}
            />
          ))}
        </div>
      </div>
      <div
        className=" bg-gray-100 text-xs z-999 absolute overflow-auto right-0 bottom-0 w-120 border border-gray-300 shadow-xl rounded h-[400px]"
        style={{
          left: `${windowPos.x}px`,
          top: `${windowPos.y}px`,
          width: `${windowSize.width}px`,
          height: `${windowSize.height}px`,
          display: isWindowOpen ? "block" : "none",
        }}
      >
        <div
          onMouseDown={handleMouseDown}
          className="h-6 cursor-move sticky top-0 bg-gray-200 border-b border-gray-300"
        ></div>
        <div className="p-4">
          <div className="gap-2 mb-2 flex-wrap flex items-center">
            <button
              className="border bg-white px-4 py-1 rounded border-gray-300"
              onClick={handleAdd}
            >
              Add
            </button>
            <button
              className="border bg-white px-4 py-1 rounded border-gray-300"
              onClick={() => setEditing(!editing)}
            >
              Edit
            </button>
            <button
              className="border bg-white px-4 py-1 rounded border-gray-300"
              onClick={() => {
                try {
                  // Download full world backup from server
                  window.location.href = "/api/export";
                } catch {}
              }}
            >
              Backup
            </button>
            <button
              className="border bg-white px-4 py-1 rounded border-gray-300"
              onClick={() => {
                handleChangeCode(
                  things.map((t) => t.code),
                  things.map((t) => t.id)
                );
              }}
            >
              Reset
            </button>
            {/* Export/Import removed in favor of global auto-save */}
            <button
              className="border bg-white px-4 py-1 rounded border-gray-300"
              onClick={() => {
                const confirm = window.confirm(
                  "Are you sure you want to clear all data?"
                );
                if (confirm) {
                  setThings([]);
                }
              }}
            >
              Clear
            </button>
            {/* Upload input removed */}
          </div>
          {selected && (
            <>
              <TextareaAutosize
                className="border bg-white w-full border-gray-300 rounded font-mono p-2"
                onChange={(e) =>
                  handleChangeCode([e.target.value], [selected.id])
                }
                onBlur={() => selected?.id && flushCodeSave(selected.id)}
                value={target?.code}
                minRows={10}
                maxRows={10}
              />
              <div className="gap-2 mb-2 flex items-center">
                <button
                  className="border bg-white px-4 py-1 rounded border-gray-300"
                  onClick={handleDelete}
                >
                  Delete
                </button>
                <button
                  className="border bg-white px-4 py-1 rounded border-gray-300"
                  onClick={() =>
                    handleChangeCode([selected.code || ""], [selected.id])
                  }
                >
                  Reset
                </button>
              </div>
            </>
          )}
          <ThingList
            setSelected={(t) => {
              setSelected(t);
              centerOnThing(t);
            }}
            selected={selected}
            things={things}
          />
        </div>
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 cursor-se-resize`}
          onMouseDown={handleResizeMouseDown}
          title="Resize"
        ></div>
      </div>
      <button
        onClick={() => setIsWindowOpen(!isWindowOpen)}
        className="fixed bottom-6 right-6 cursor-pointer hover:bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center bg-gray-50 shadow-lg border border-gray-300"
      >
        <FiMenu />
      </button>
    </div>
  );
}
