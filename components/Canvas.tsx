/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { MouseEventHandler, useEffect, useRef, useState } from "react";
import { ThingComponent } from "./Thing";
import { getThing, Thing } from "@/lib/objax";
import TextareaAutosize from "react-textarea-autosize";
import { ThingList } from "./ThingList";
import { FiMenu } from "react-icons/fi";

export function Canvas() {
  const [selected, setSelected] = useState<Thing | null>(null);
  const [things, setThings] = useState<Thing[]>([]);
  const latestThingsRef = useRef<Thing[]>(things);
  latestThingsRef.current = things;
  // Track last saved sanitized global JSON per id
  const lastSavedMapRef = useRef<Map<string, string>>(new Map());
  const [editing, setEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
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
  };
  const handleDelete = () => {
    if (!selected) return;
    setThings((prev) => prev.filter((p) => p.id !== selected.id));
    setSelected(null);
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
  };
  const target = things.find((t) => t.id === selected?.id);

  // Sanitize a Thing for global save: use code for logical fields, current geometry is global
  const sanitizeForGlobalSave = (t: Thing): Thing => {
    let parsed;
    try {
      parsed = getThing(String(t.code ?? ""));
    } catch {
      parsed = { name: "", fields: [], transitions: [], eventActions: [], sticky: undefined } as any;
    }
    return {
      id: t.id,
      code: t.code,
      name: parsed.name,
      sticky: parsed.sticky,
      eventActions: parsed.eventActions,
      transitions: parsed.transitions,
      fields: parsed.fields,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
    } as Thing;
  };

  // Load globals and sanitize for local use
  const reloadFromServer = async () => {
    try {
      const res = await fetch("/api/objects?limit=500", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const incoming = Array.isArray(data?.things) ? (data.things as Thing[]) : [];
      const view = incoming
        .filter((t) => t?.id && typeof t.id === "string")
        .map((t) => sanitizeForGlobalSave(t));
      setThings(view);
      const m = new Map<string, string>();
      for (const t of view) {
        if (!t?.id) continue;
        // Save sanitized snapshot baseline
        m.set(t.id as string, JSON.stringify(sanitizeForGlobalSave(t)));
      }
      lastSavedMapRef.current = m;
    } catch {}
  };

  // Initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await reloadFromServer();
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

  // Poll server and merge without clobbering unsaved local changes
  useEffect(() => {
    let cancelled = false;
    let backoff = 5000;
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch("/api/objects?limit=500", { cache: "no-store" });
        if (!res.ok) throw new Error("poll failed");
        const data = await res.json();
        const incoming: Thing[] = Array.isArray(data?.things) ? data.things : [];

        setThings((prev) => {
          const prevById = new Map<string, Thing>();
          prev.forEach((p) => p.id && prevById.set(p.id, p));

          const unsaved = new Set<string>();
          for (const p of prev) {
            if (!p?.id) continue;
            const s = JSON.stringify(sanitizeForGlobalSave(p));
            if (lastSavedMapRef.current.get(p.id) !== s) unsaved.add(p.id);
          }

          const nextById = new Map<string, Thing>();
          for (const inc of incoming) {
            const id = inc.id as string;
            if (!id) continue;
            if (unsaved.has(id) && prevById.has(id)) {
              // keep local unsaved
              nextById.set(id, prevById.get(id)!);
            } else {
              const sanitized = sanitizeForGlobalSave(inc);
              nextById.set(id, sanitized);
            }
          }
          // keep local items not present on server if unsaved
          for (const p of prev) {
            if (!p?.id) continue;
            if (!nextById.has(p.id) && unsaved.has(p.id)) {
              nextById.set(p.id, p);
            }
          }
          const next = Array.from(nextById.values());

          // update baseline for items we accepted from server
          const newBaseline = new Map(lastSavedMapRef.current);
          for (const [id, t] of nextById) {
            if (!unsaved.has(id)) {
              newBaseline.set(id, JSON.stringify(sanitizeForGlobalSave(t)));
            }
          }
          lastSavedMapRef.current = newBaseline;
          return next;
        });
        backoff = 5000;
      } catch {
        backoff = Math.min(20000, backoff * 2);
      } finally {
        if (!cancelled) setTimeout(tick, backoff);
      }
    };
    const id = setTimeout(tick, 5000);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  // Periodic auto-save: send partial upserts (code/x/y/width/height)
  useEffect(() => {
    const save = async () => {
      const current = latestThingsRef.current;
      const prev = lastSavedMapRef.current;
      const curMap = new Map<string, string>();
      const upserts: any[] = [];
      for (const t of current) {
        if (!t?.id) continue;
        const sanitized = sanitizeForGlobalSave(t);
        const s = JSON.stringify(sanitized);
        curMap.set(t.id, s);
        const prevStr = prev.get(t.id);
        if (prevStr !== s) {
          // Build a minimal patch of changed top-level keys
          const patch: any = { id: t.id };
          const prevObj = prevStr ? JSON.parse(prevStr) : {};
          const keys: (keyof Thing)[] = [
            "code",
            "x",
            "y",
            "width",
            "height",
          ];
          for (const k of keys) {
            if ((prevObj as any)[k] !== (sanitized as any)[k]) {
              (patch as any)[k] = (sanitized as any)[k];
            }
          }
          // If new object, ensure code and geometry are present
          if (!prevStr) {
            patch.code = sanitized.code;
            patch.x = sanitized.x;
            patch.y = sanitized.y;
            patch.width = sanitized.width;
            patch.height = sanitized.height;
          }
          upserts.push(patch);
        }
      }
      const deletes: string[] = [];
      for (const [id] of prev) {
        if (!curMap.has(id)) deletes.push(id);
      }
      if (upserts.length === 0 && deletes.length === 0) return;
      try {
        const res = await fetch("/api/objects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upserts, deletes }),
        });
        if (res.ok) {
          lastSavedMapRef.current = curMap;
        }
      } catch {}
    };
    const id = setInterval(save, 5000);
    return () => clearInterval(id);
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

  // no browser persistence

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
                // Re-evaluate all from their current code
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
