import { Dispatch, SetStateAction, useEffect } from "react";

import {
  BinaryOp,
  EventActionType,
  FieldType,
  Name,
  OperationType,
  Thing,
  TransitionType,
  ValueType,
  getField,
  getOperation,
  getTransition,
  getValue,
} from "@/lib/objax";

type DebounceFn = (func: () => Promise<any>, wait: number) => Promise<void>;

type Params = {
  things: Thing[];
  setThings: Dispatch<SetStateAction<Thing[]>>;
  schedulePersist: (args?: { things?: Thing[]; deletes?: Thing[] }) => Promise<void>;
  debounce: DebounceFn;
  getNextTransitionValue: (
    ea: EventActionType,
    transition: TransitionType,
    field: FieldType,
    things: Thing[]
  ) => ValueType | undefined;
  keyFromEventAction: (ea: EventActionType) => string;
  pruneTransitionKeys: (keys: Iterable<string>) => void;
};

export function useIntervalTransitions({
  things,
  setThings,
  schedulePersist,
  debounce,
  getNextTransitionValue,
  keyFromEventAction,
  pruneTransitionKeys,
}: Params) {
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

    const validTransitionKeys = new Set<string>(
      tasks.map(({ ea }) => keyFromEventAction(ea))
    );
    pruneTransitionKeys(validTransitionKeys);

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
      const results: {
        ea: EventActionType;
        transition: TransitionType | null;
        value: ValueType;
        field: FieldType;
        fieldThingName: string;
        operation: OperationType | null;
      }[] = [];

      for (const { ea } of batch) {
        const transition = getTransition(
          things,
          (ea.transition.path[0] as Name).name,
          (ea.transition.path[1] as Name).name
        );
        if (transition) {
          const field = getField(
            things,
            (transition.field.path[0] as Name).name,
            (transition.field.path[1] as Name).name
          );
          if (!field) {
            return;
          }
          const value = getNextTransitionValue(ea, transition, field, things);
          if (value === undefined) return;
          results.push({
            ea,
            value,
            field,
            transition,
            operation: null,
            fieldThingName: (transition.field.path[0] as Name).name,
          });
        }
        // Try operation if transition not found
        const op = getOperation(
          things,
          (ea.transition.path[0] as Name).name,
          (ea.transition.path[1] as Name).name
        );
        if (!op) break;
        if (!op.block) break;
        const opField = getField(
          things,
          (op.field.path[0] as Name).name,
          (op.field.path[1] as Name).name
        );
        if (!opField) break;
        getValue(things, (op.block.expr as BinaryOp).right, op.field);
        const nextExpr = getValue(things, op.block.expr, op.field);
        results.push({
          ea,
          value: nextExpr,
          field: opField,
          operation: op,
          transition: null,
          fieldThingName: (op.field.path[0] as Name).name,
        });
      }

      if (results.length === 0) return;

      const updatedList: Thing[] = [];
      const newThings = things.map((p) => {
        const target = results.find((r) => p.name === r.fieldThingName);
        if (target) {
          const updated = {
            ...p,
            fields: p.fields?.map((f) => {
              if (
                f.name.name === (target.transition?.field.path[1] as Name)?.name
              ) {
                return { ...f, value: target.value };
              }
              if (
                f.name.name === (target.operation?.field.path[1] as Name)?.name
              ) {
                return { ...f, value: target.value };
              }
              return f;
            }),
          };
          updatedList.push(updated);
          return updated;
        }
        return p;
      });

      setThings(newThings);
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
  }, [
    debounce,
    getNextTransitionValue,
    keyFromEventAction,
    pruneTransitionKeys,
    schedulePersist,
    setThings,
    things,
  ]);
}
