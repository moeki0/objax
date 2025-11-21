/* eslint-disable @typescript-eslint/no-explicit-any */
import { MutableRefObject, useCallback, useRef } from "react";

import { Thing, getThing } from "@/lib/objax";

type Params = {
  things: Thing[];
  setThings: React.Dispatch<React.SetStateAction<Thing[]>>;
  worldId: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  publishUpdate: (payload: {
    upserts?: Thing[];
    deletes?: string[];
  }) => Promise<void>;
  schedulePersist: (args?: {
    things?: Thing[];
    deletes?: Thing[];
  }) => Promise<void>;
  setParseError: (err: string | null) => void;
  currentCodeRef: MutableRefObject<string>;
  selected: Thing | null;
  setSelected: React.Dispatch<React.SetStateAction<Thing | null>>;
};

function resetPos(
  t: Thing,
  prev: Thing,
  things: Thing[],
  seen = new Set<string>()
): any {
  if (t.sticky === prev.sticky) return { x: prev.x!, y: prev.y! };
  const x = prev.x!;
  const y = prev.y!;
  const parent = things.find((tt) => tt.name === prev.sticky);
  const currentParent = things.find((tt) => tt.name === t.sticky);
  if (!currentParent && !parent) return { x, y };
  if (!currentParent && parent) {
    if (seen.has(t.name)) return { x, y };
    seen.add(t.name);
    const p = resetPos(parent, parent, things, seen);
    return { x: p.x + x, y: p.y + x };
  }
  if (seen.has(t.name)) return { x, y };
  seen.add(t.name);
  if (!currentParent) return { x, y };
  return { x: 0, y: 0 };
}

export function useThingEditor({
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
}: Params) {
  const saveTimersRef = useRef<Map<string, any>>(new Map());

  const scheduleCodeSave = useCallback(
    (id: string, thing: Thing) => {
      const timers = saveTimersRef.current;
      if (timers.has(id)) {
        clearTimeout(timers.get(id));
      }
      const handle = setTimeout(() => {
        schedulePersist({ things: [thing] });
      }, 600);
      timers.set(id, handle);
    },
    [schedulePersist]
  );

  const flushCodeSave = useCallback(
    (id: string, thing: Thing) => {
      const timers = saveTimersRef.current;
      if (timers.has(id)) {
        clearTimeout(timers.get(id));
        timers.delete(id);
      }
      scheduleCodeSave(id, thing);
    },
    [scheduleCodeSave]
  );

  const handleAdd = useCallback(() => {
    if ((things?.length || 0) >= 1000) return; // client-side cap per world
    const left = scrollRef.current?.scrollLeft ?? 0;
    const top = scrollRef.current?.scrollTop ?? 0;
    const id = Math.random().toString(32).substring(2);
    const newThing: Thing = {
      id,
      worldId: worldId || undefined,
      name: "",
      x: left,
      y: top,
      width: 100,
      height: 100,
      code: `name is`,
      sticky: undefined,
      eventActions: [],
      transitions: [],
      fields: [],
    };
    setThings((c) => [...c, newThing]);
    publishUpdate({ upserts: [newThing] });
    schedulePersist({ things: [newThing] });
  }, [
    publishUpdate,
    schedulePersist,
    scrollRef,
    setThings,
    things?.length,
    worldId,
  ]);

  const handleDelete = useCallback(() => {
    if (!selected) return;
    setThings((prev) => prev.filter((p) => p.id !== selected.id));
    setSelected(null);
    currentCodeRef.current = "";
    publishUpdate({ deletes: [selected.id!] });
    schedulePersist({ deletes: [selected!] });
  }, [
    currentCodeRef,
    publishUpdate,
    schedulePersist,
    selected,
    setSelected,
    setThings,
  ]);

  const handleChangeCode = useCallback(
    (values: (string | undefined)[], ids: (string | undefined)[]) => {
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
            x: resetPos(result, p, things).x,
            y: resetPos(result, p, things).y,
            code,
            name: result.name,
            sticky: result.sticky,
            fields: result.fields,
            transitions: result.transitions,
            eventActions: result.eventActions,
            operations: (result as any).operations,
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
    },
    [publishUpdate, scheduleCodeSave, setParseError, setThings, things]
  );

  const handleResetSelected = useCallback(() => {
    if (!selected) return;
    handleChangeCode([selected.code || ""], [selected.id]);
  }, [handleChangeCode, selected]);

  return {
    handleAdd,
    handleDelete,
    handleChangeCode,
    flushCodeSave,
    handleResetSelected,
  };
}
