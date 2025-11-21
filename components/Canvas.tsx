/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ThingComponent } from "./Thing";
import { getThing, getValue, Thing } from "@/lib/objax";
import TextareaAutosize from "react-textarea-autosize";
import { ThingList } from "./ThingList";
import { FiMenu } from "react-icons/fi";
import { getAblyClient } from "@/lib/ably/client";

export function Canvas() {
  const [parseError, setParseError] = useState<string | null>(null);
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
  // Buffer for delayed persistence to KV
  const persistBufferRef = useRef<{
    upserts: Map<string, Thing>;
    deletes: Map<string, Thing>;
    timer: any | null;
  }>({ upserts: new Map(), deletes: new Map(), timer: null });
  const currentCode = useRef("");

  const getConnId = () => {
    try {
      const c = getAblyClient();
      return (c.connection as any)?.id as string | undefined;
    } catch {
      return undefined;
    }
  };

  const publishUpdate = async ({
    upserts = [] as Thing[],
    deletes = [] as string[],
  } = {}) => {
    try {
      const client = getAblyClient();
      const ch = client.channels.get("things");
      await ch.publish("update", {
        upserts,
        deletes,
        sourceConnectionId: getConnId(),
      });
    } catch {}
  };

  const timeout = useRef<Date>(new Date());

  function debounce(func: any, wait: number) {
    const time = new Date(Date.parse(timeout.current.toISOString()));
    time!.setSeconds(
      time.getSeconds() + wait > 59 ? 0 : time.getSeconds() + wait
    );
    if (new Date() > time) {
      func();
      timeout.current = new Date();
    }
  }

  const schedulePersist = useCallback(
    async ({ things = [] as Thing[], deletes = [] as Thing[] } = {}) => {
      const buf = persistBufferRef.current;
      // Merge upserts
      for (const thing of things) {
        buf.deletes.delete(thing.id!);
        buf.upserts.set(thing.id!, thing);
      }
      // Merge deletes
      for (const thing of deletes) {
        if (!thing) continue;
        buf.upserts.delete(thing.id!);
        buf.deletes.set(thing.id!, thing);
      }
      // Reset timer
      if (buf.timer) clearTimeout(buf.timer);
      const upsertsArr = Array.from(buf.upserts.values());
      const deletesArr = Array.from(buf.deletes.values());
      buf.upserts.clear();
      buf.deletes.clear();
      buf.timer = null;
      await postObjects({ upserts: upsertsArr, deletes: deletesArr });
    },
    []
  );

  const scheduleCodeSave = (id: string, thing: Thing) => {
    const timers = saveTimersRef.current;
    if (timers.has(id)) {
      clearTimeout(timers.get(id));
    }
    const handle = setTimeout(() => {
      schedulePersist({ things: [thing] });
    }, 600);
    timers.set(id, handle);
  };

  const flushCodeSave = (id: string, thing: Thing) => {
    const timers = saveTimersRef.current;
    if (timers.has(id)) {
      clearTimeout(timers.get(id));
      timers.delete(id);
    }
    scheduleCodeSave(id, thing);
  };
  const postObjects = async ({
    upserts = [] as Thing[],
    deletes = [] as Thing[],
  }) => {
    if (upserts.length === 0 && deletes.length === 0) return;
    try {
      const res = await fetch("/api/objects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ upserts, deletes }),
      });
      if (res.ok) {
        // Update local snapshot cache to avoid redundant interval writes
        const cur = new Map(lastSavedSnapshotRef.current);
        for (const u of upserts) {
          const t = latestThingsRef.current.find((tt) => tt.id === u.id);
          const snap = JSON.stringify({
            code: String(u.code ?? t?.code ?? ""),
            x: u.x ?? t?.x ?? 0,
            y: u.y ?? t?.y ?? 0,
            width: u.width ?? t?.width ?? 200,
            height: u.height ?? t?.height ?? 200,
          });
          cur.set(u.id!, snap);
        }
        for (const thing of deletes) cur.delete(thing.id!);
        lastSavedSnapshotRef.current = cur;
      }
    } catch {}
  };
  const handleAdd = () => {
    const left = scrollRef.current?.scrollLeft ?? 0;
    const top = scrollRef.current?.scrollTop ?? 0;
    const id = Math.random().toString(32).substring(2);
    const newThing = {
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
    };
    setThings((c) => [...c, newThing]);
    publishUpdate({ upserts: [newThing] });
    schedulePersist({ things: [newThing] });
  };
  const handleDelete = () => {
    if (!selected) return;
    setThings((prev) => prev.filter((p) => p.id !== selected.id));
    setSelected(null);
    currentCode.current = "";
    // Ably publish immediately; persist later
    publishUpdate({ deletes: [selected.id!] });
    schedulePersist({ deletes: [selected!] });
  };
  const handleChangeCode = (
    values: (string | undefined)[],
    ids: (string | undefined)[]
  ) => {
    const newThings = things.map((p) => {
      if (ids.includes(p.id!)) {
        const code = values[ids.findIndex((i) => i === p.id!)]!;
        let result;
        try {
          result = getThing(code);
          setParseError(null);
        } catch (e) {
          setParseError(String(e));
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
    setThings(newThings);
    const updatedThings = newThings.filter((t) => ids.includes(t.id));
    if (updatedThings.length) publishUpdate({ upserts: updatedThings });
    ids.forEach(
      (id, index) => id && scheduleCodeSave(id, updatedThings[index])
    );
  };

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
          const clientConnId = (client.connection as any)?.id as
            | string
            | undefined;
          if (clientConnId && data?.sourceConnectionId === clientConnId) return;
        } catch {}
        const upserts = Array.isArray(data?.upserts) ? data.upserts : [];
        const deletes = Array.isArray(data?.deletes) ? data.deletes : [];
        if (upserts.length === 0 && deletes.length === 0) return;
        setThings((prev) => {
          let next = prev.filter((t) => !deletes.includes(t.id!));
          const incoming: any[] = upserts.filter((u: any) => u?.id);
          const built = incoming.map((u) => {
            const base = buildFromGlobal({
              id: String(u.id),
              code: String(u.code ?? ""),
              x: typeof u.x === "number" ? u.x : undefined,
              y: typeof u.y === "number" ? u.y : undefined,
              width: typeof u.width === "number" ? u.width : undefined,
              height: typeof u.height === "number" ? u.height : undefined,
            });
            if (Array.isArray(u.fields) && Array.isArray(base.fields)) {
              const overlay = new Map<string, any>(
                u.fields.map((f: any) => [f?.name?.name, f])
              );
              base.fields = base.fields.map((f: any) => {
                const ov = overlay.get(f?.name?.name);
                if (!ov) return f;
                return { ...f, value: ov.value };
              });
            }
            return base;
          });
          for (const b of built) {
            const idx = next.findIndex((t) => t.id === b.id);
            if (idx >= 0)
              next = [...next.slice(0, idx), b, ...next.slice(idx + 1)];
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
  const [isSyntaxOpen, setIsSyntaxOpen] = useState(false);
  // no file import/export in global mode

  // Interval-driven actions: onIntervalWith{N}ms is <Thing.Transition>
  useEffect(() => {
    // Build interval config from current things
    type IntervalTask = {
      ms: number;
      thingId: string;
      ea: NonNullable<Thing["eventActions"]>[number];
    };

    const tasks: IntervalTask[] = [];
    for (const t of things) {
      const eas = Array.isArray(t.eventActions) ? t.eventActions : [];
      for (const ea of eas) {
        const name = ea?.name?.name || "";
        const m = name.match(/intervalwith(\d+)ms/);
        if (!m) continue;
        // Clamp to ~60fps minimum for smooth animation
        const MIN_INTERVAL_MS = 16;
        const ms = Math.max(MIN_INTERVAL_MS, Number(m[1]));
        if (!Number.isFinite(ms) || ms <= 0) continue;
        tasks.push({ ms, thingId: t.id!, ea });
      }
    }

    if (tasks.length === 0) return; // nothing to do

    // Group tasks by interval
    const byMs = new Map<number, IntervalTask[]>();
    for (const task of tasks) {
      const arr = byMs.get(task.ms) || [];
      arr.push(task);
      byMs.set(task.ms, arr);
    }

    // Keep handles to clear on changes
    const handles: any[] = [];

    const runBatch = (batch: IntervalTask[]) => {
      // Compute all updates from this tick before applying
      const changes: {
        ea: IntervalTask["ea"];
        fieldThingName: string;
        fieldName: string;
        nextValue: any;
      }[] = [];

      const cur = latestThingsRef.current;

      for (const { ea } of batch) {
        // Reuse the same logic as click handler: find transition, target field, and next state
        const trThing = ea.transition.path[0]?.name;
        const trName = ea.transition.path[1]?.name;
        if (!trThing || !trName) continue;
        const transition = cur
          .find((tt) => tt.name === trThing)
          ?.transitions?.find((tr) => tr.name.name === trName);
        if (!transition) continue;
        const fieldThing = transition.field.path[0]?.name;
        const fieldName = transition.field.path[1]?.name;
        if (!fieldThing || !fieldName) continue;
        const field = cur
          .find((tt) => tt.name === fieldThing)
          ?.fields?.find((f) => f.name.name === fieldName);
        if (!field) continue;
        const idx = transition.states.findIndex(
          (st) => getValue(cur, st) === getValue(cur, field.value)
        );
        const nextIndex =
          idx === -1 ? 0 : idx < transition.states.length - 1 ? idx + 1 : 0;
        const nextValue = transition.states[nextIndex];
        changes.push({ ea, fieldThingName: fieldThing, fieldName, nextValue });
      }

      if (changes.length === 0) return;

      // Apply changes
      const updatedList: Thing[] = [];
      const nextThings = latestThingsRef.current.map((p) => {
        const target = changes.find((c) => p.name === c.fieldThingName);
        if (!target) return p;
        const updated: Thing = {
          ...p,
          fields: (p.fields || []).map((f) =>
            f.name.name === target.fieldName
              ? { ...f, value: target.nextValue }
              : f
          ),
        };
        updatedList.push(updated);
        return updated;
      });

      // Update state and persist (do not publish over WS for onInterval)
      setThings(nextThings);
      if (updatedList.length) {
        debounce(() => schedulePersist({ things: updatedList }), 2);
      }
    };

    for (const [ms, batch] of byMs.entries()) {
      const h = setInterval(() => runBatch(batch), ms);
      handles.push(h);
    }

    return () => {
      handles.forEach((h) => clearInterval(h));
    };
  }, [publishUpdate, schedulePersist, things]);

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
              setSelected={() => {
                currentCode.current = thing.code || "";
                setSelected(thing);
              }}
              editing={editing}
              scrollLeft={scrollPos.left}
              scrollTop={scrollPos.top}
              onActionUpdate={(ids, updatedList) => {
                if (ids.length) publishUpdate({ upserts: updatedList });
                if (ids.length) schedulePersist({ things: updatedList });
              }}
              onGeometryChange={(id, updatedThing) => {
                publishUpdate({ upserts: [updatedThing] });
                schedulePersist({ things: [updatedThing] });
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
          </div>
          {selected && (
            <>
              <TextareaAutosize
                className="border bg-white w-full border-gray-300 rounded font-mono p-2"
                onChange={(e) => {
                  currentCode.current = e.target.value;
                  handleChangeCode([e.target.value], [selected.id]);
                }}
                onBlur={() =>
                  selected?.id && flushCodeSave(selected.id, selected)
                }
                value={currentCode.current}
                minRows={10}
                maxRows={10}
              />
              {parseError && (
                <div className="border border-red-400 bg-red-50 rounded p-2 mt-1 mb-2">
                  {parseError}
                </div>
              )}
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
              currentCode.current = t.code || "";
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
      <button
        onClick={() => setIsSyntaxOpen(true)}
        className="fixed bottom-20 right-6 cursor-pointer hover:bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center bg-gray-50 shadow-lg border border-gray-300 text-base"
        title="View syntax"
        type="button"
      >
        ?
      </button>

      {isSyntaxOpen && (
        <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsSyntaxOpen(false)}
          />
          <div className="relative bg-white w-full sm:w-[720px] max-h-[80vh] rounded shadow-xl border border-gray-300 m-0 sm:m-8 overflow-scroll">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-300">
              <div className="font-medium">Syntax Cheat Sheet</div>
              <button
                className="text-gray-600 hover:text-black"
                onClick={() => setIsSyntaxOpen(false)}
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-4 text-sm leading-6 overflow-auto">
              <p className="mb-3">
                A quick overview of the mini-language used in this canvas.
              </p>

              <div className="mb-4">
                <div className="font-semibold mb-1">Basics</div>
                <pre className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap">
                  {`<Name> is <Value>
duplicate <Name>
sticky <Name>
on <Event> is <Reference>
transition <Name> of <Reference> is [<Value>, <Value>, ...]
if <Condition> then <Statement>
`}
                </pre>
              </div>

              <div className="mb-4">
                <div className="font-semibold mb-1">Values</div>
                <ul className="list-disc pl-5">
                  <li>Number: 123</li>
                  <li>{'String: "hello"'}</li>
                  <li>Boolean: true / false</li>
                  <li>{'Array: [1, 2, "a"]'}</li>
                  <li>
                    Reference: <code>Name.Field</code> (dot-separated)
                  </li>
                </ul>
              </div>

              <div className="mb-4">
                <div className="font-semibold mb-1">
                  Conditions and Expressions
                </div>
                <ul className="list-disc pl-5">
                  <li>
                    <code>A eq B</code> equality check (A and B are values or
                    references)
                  </li>
                  <li>
                    Logical And/Or: <code>true and false</code>,
                    <code> A eq B or C eq D</code>
                  </li>
                  <li>
                    Logical Not: <code>not (A eq B)</code>
                  </li>
                  <li>
                    Add/Sub: <code>1 + 2 - 3</code>
                  </li>
                  <li>
                    Mul/Div: <code>1 * 2 / 3</code>
                  </li>
                  <li>
                    Grouping: <code>(1 + 2) * 3</code>
                  </li>
                </ul>
              </div>

              <div className="mb-4">
                <div className="font-semibold mb-1">Examples</div>
                <pre className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap">
                  {`title is "Hello"
count is 1
sticky Parent
duplicate Original
on click is action.run
onIntervalWith1000ms is Timer.second
transition State of input.state is ["idle", "running"]
if count eq 1 then title is "Once"`}
                </pre>
              </div>

              <div className="text-xs text-gray-500">
                Note: Names may include Japanese characters, alphanumerics, and
                underscores.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
