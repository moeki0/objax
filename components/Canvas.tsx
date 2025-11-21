/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAblyClient } from "@/lib/ably/client";
import { getField, getValue, Thing } from "@/lib/objax";
import { FiMenu } from "react-icons/fi";
import { useSession } from "next-auth/react";
import { useTransitionIndex } from "./hooks/useTransitionIndex";
import { useIntervalTransitions } from "./hooks/useIntervalTransitions";
import { CanvasViewport } from "./canvas/CanvasViewport";
import { ControlWindow } from "./canvas/ControlWindow";
import { SyntaxHelpModal } from "./canvas/SyntaxHelpModal";
import { useWorldLoading } from "./hooks/useWorldLoading";
import { useRealtimeChannel } from "./hooks/useRealtimeChannel";
import { useThingEditor } from "./hooks/useThingEditor";

export function Canvas({ initialWorldUrl }: { initialWorldUrl?: string } = {}) {
  const { data: session } = useSession();
  const [parseError, setParseError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Thing | null>(null);
  const [things, setThings] = useState<Thing[]>([]);
  const [worldId, setWorldId] = useState<string | null>(null);
  const latestThingsRef = useRef<Thing[]>(things);
  latestThingsRef.current = things;
  const lastSavedSnapshotRef = useRef<Map<string, string>>(new Map());
  const [editing, setEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  // Buffer for delayed persistence to KV
  const persistBufferRef = useRef<{
    upserts: Map<string, Thing>;
    deletes: Map<string, Thing>;
    timer: any | null;
  }>({ upserts: new Map(), deletes: new Map(), timer: null });
  const worldIdRef = useRef<string | null>(null);
  worldIdRef.current = worldId;
  const currentCodeRef = useRef("");
  const {
    getNextValue: getNextTransitionValue,
    keyFromEventAction,
    pruneKeys: pruneTransitionKeys,
  } = useTransitionIndex();
  useWorldLoading({
    initialWorldUrl,
    worldId,
    setWorldId,
    setThings,
    lastSavedSnapshotRef,
  });
  useRealtimeChannel({
    worldId,
    setThings,
    lastSavedSnapshotRef,
  });

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
    if (!worldIdRef.current) return; // wait until world resolved
    try {
      const client = getAblyClient();
      const ch = client.channels.get(
        `things:${worldIdRef.current || "default"}`
      );
      await ch.publish("update", {
        upserts,
        deletes,
        sourceConnectionId: getConnId(),
      });
    } catch {}
  };

  const timeout = useRef<Date>(new Date());

  async function debounce(func: () => Promise<any>, wait: number) {
    const time = new Date(Date.parse(timeout.current.toISOString()));
    time!.setSeconds(
      time.getSeconds() + wait > 59 ? 0 : time.getSeconds() + wait
    );
    if (new Date() > time) {
      await func();
      timeout.current = new Date();
    }
  }

  const postObjects = async ({
    upserts = [] as Thing[],
    deletes = [] as Thing[],
  }) => {
    if (upserts.length === 0 && deletes.length === 0) return;
    try {
      const currentUser = session?.user
        ? {
            name: session.user.name ?? null,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
            id: (session as any).user?.id ?? null,
          }
        : null;

      const upsertsWithUser = currentUser
        ? upserts.map((obj) => {
            const existing = Array.isArray((obj as any).users)
              ? ((obj as any).users as any[])
              : [];
            const merged = [
              ...existing,
              {
                name: currentUser.name,
                email: currentUser.email,
                image: currentUser.image,
                id: currentUser.id,
              },
            ];
            // de-dup by email if present
            const seen = new Set<string | null>();
            const dedup = merged.filter((u) => {
              const key = (u?.email as any) ?? null;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return { ...obj, users: dedup } as Thing;
          })
        : upserts;

      const wid = worldIdRef.current || "default";
      const res = await fetch(
        `/api/objects?worldId=${encodeURIComponent(wid)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ upserts: upsertsWithUser, deletes }),
        }
      );

      if (res.ok) {
        // Update local snapshot cache to avoid redundant interval writes
        const cur = new Map(lastSavedSnapshotRef.current);
        for (const u of upsertsWithUser) {
          const t = latestThingsRef.current.find((tt) => tt.id === u.id);
          const snap = JSON.stringify({
            code: String((u as any).code ?? t?.code ?? ""),
            x: (u as any).x ?? t?.x ?? 0,
            y: (u as any).y ?? t?.y ?? 0,
            width: (u as any).width ?? t?.width ?? 200,
            height: (u as any).height ?? t?.height ?? 200,
          });
          cur.set(u.id!, snap);
        }
        for (const thing of deletes) cur.delete(thing.id!);
        lastSavedSnapshotRef.current = cur;
      }
    } catch {}
  };

  const schedulePersist = useCallback(
    async ({ things = [] as Thing[], deletes = [] as Thing[] } = {}) => {
      const buf = persistBufferRef.current;
      // Merge into buffer first
      for (const thing of things) {
        if (!thing) continue;
        buf.deletes.delete(thing.id!);
        buf.upserts.set(thing.id!, thing);
      }
      for (const thing of deletes) {
        if (!thing) continue;
        buf.upserts.delete(thing.id!);
        buf.deletes.set(thing.id!, thing);
      }

      // If worldId not resolved yet, retry shortly without clearing buffer
      const wid = worldIdRef.current;
      if (!wid) {
        if (buf.timer) clearTimeout(buf.timer);
        buf.timer = setTimeout(() => schedulePersist({}), 200);
        return;
      }

      // Flush buffered changes
      if (buf.timer) clearTimeout(buf.timer);
      const upsertsArr = Array.from(buf.upserts.values());
      const deletesArr = Array.from(buf.deletes.values());
      buf.upserts.clear();
      buf.deletes.clear();
      buf.timer = null;
      debounce(
        async () =>
          await postObjects({ upserts: upsertsArr, deletes: deletesArr }),
        0.3
      );
    },
    [session]
  );

  const {
    handleAdd,
    handleChangeCode,
    handleDelete,
    handleResetSelected,
    flushCodeSave,
  } = useThingEditor({
    things,
    setThings,
    worldId,
    scrollRef,
    publishUpdate,
    schedulePersist,
    setParseError,
    currentCodeRef,
    selected,
    setSelected,
  });
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

  const bgRef = useRef<HTMLDivElement>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [isSyntaxOpen, setIsSyntaxOpen] = useState(false);

  useIntervalTransitions({
    things,
    setThings,
    schedulePersist,
    debounce,
    getNextTransitionValue,
    keyFromEventAction,
    pruneTransitionKeys,
  });

  const getAbsolutePos = (
    t: Thing,
    seen = new Set<string>()
  ): {
    x: number;
    y: number;
  } => {
    const cur = latestThingsRef.current;
    const self = cur.find((tt) => tt.id === t.id) ?? t;
    const offsetXField = getField(cur, self.name, "offsetX");
    const offsetYField = getField(cur, self.name, "offsetY");
    const offsetX = offsetXField ? Number(getValue(cur, offsetXField.value)) : 0;
    const offsetY = offsetYField ? Number(getValue(cur, offsetYField.value)) : 0;
    const x = (self.x ?? 0) + (Number.isFinite(offsetX) ? offsetX : 0);
    const y = (self.y ?? 0) + (Number.isFinite(offsetY) ? offsetY : 0);
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
      <CanvasViewport
        things={things}
        selected={selected}
        editing={editing}
        scrollPos={scrollPos}
        setScrollPos={setScrollPos}
        setSelected={setSelected}
        setThings={setThings}
        currentCode={currentCodeRef}
        publishUpdate={publishUpdate}
        schedulePersist={schedulePersist}
        debounce={debounce}
        scrollRef={scrollRef}
        bgRef={bgRef}
        onToggleWindow={() => setIsWindowOpen(!isWindowOpen)}
      />
      <ControlWindow
        isOpen={isWindowOpen}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onReset={handleResetSelected}
        onChangeCode={handleChangeCode}
        onFlushCodeSave={flushCodeSave}
        onToggleEdit={() => setEditing(!editing)}
        setIsSyntaxOpen={setIsSyntaxOpen}
        things={things}
        selected={selected}
        setSelected={(t) => {
          setSelected(t);
          if (t) centerOnThing(t);
        }}
        currentCodeRef={currentCodeRef}
        parseError={parseError}
      />
      <button
        onClick={() => setIsWindowOpen(!isWindowOpen)}
        className="fixed bottom-6 right-6 cursor-pointer hover:bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center bg-gray-50 shadow-lg border border-gray-300"
      >
        <FiMenu />
      </button>

      <SyntaxHelpModal
        isOpen={isSyntaxOpen}
        onClose={() => setIsSyntaxOpen(false)}
      />
    </div>
  );
}
