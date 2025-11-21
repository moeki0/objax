import { Dispatch, SetStateAction, useCallback } from "react";

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

type Params = {
  thing: Thing;
  things: Thing[];
  editing: boolean;
  onActionUpdate?: (ids: string[], updatedList: Thing[]) => void;
  setThings: Dispatch<SetStateAction<Thing[]>>;
  getNextTransitionValue: (
    ea: EventActionType,
    transition: TransitionType,
    field: FieldType,
    things: Thing[]
  ) => ValueType | undefined;
  keyFromEventAction: (ea: EventActionType) => string;
  pruneTransitionKeys: (keys: Iterable<string>) => void;
};

export function useTouchActions({
  thing,
  things,
  editing,
  onActionUpdate,
  setThings,
  getNextTransitionValue,
  keyFromEventAction,
  pruneTransitionKeys,
}: Params) {
  return useCallback(
    (eventName: string) => {
      const normalized = eventName.toLowerCase();
      const targetNames =
        normalized === "click" ? ["click", "touch"] : [normalized];
      const devOnlyField = getField(things, thing.name, "devOnly");
      const devOnly = devOnlyField
        ? getValue(things, devOnlyField.value)
        : false;
      if (editing && !devOnly) {
        return;
      }
      const eas = thing.eventActions?.filter((ea) =>
        targetNames.includes(ea.name.name)
      );
      const validTransitionKeys = new Set<string>(
        (eas || []).map((ea) => keyFromEventAction(ea))
      );
      pruneTransitionKeys(validTransitionKeys);
      const results: {
        ea: EventActionType;
        transition: TransitionType | null;
        value: ValueType;
        field: FieldType;
        fieldThingName: string;
        operation: OperationType | null;
      }[] = [];
      eas?.forEach((ea) => {
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
          return;
        }
        // Try operation if transition not found
        const op = getOperation(
          things,
          (ea.transition.path[0] as Name).name,
          (ea.transition.path[1] as Name).name
        );
        if (!op) return;
        if (!op.block) return;
        const opField = getField(
          things,
          (op.field.path[0] as Name).name,
          (op.field.path[1] as Name).name
        );
        if (!opField) return;
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
      });

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

      if (updatedList.length === 0) {
        return;
      }

      setThings(newThings);
      // Notify parent which things were changed (by name -> ids)
      if (onActionUpdate) {
        try {
          const changedNames = results.map((r) => r.fieldThingName);
          const changedIds = things
            .filter((p) => changedNames.includes(p.name))
            .map((p) => p.id!)
            .filter(Boolean);
          if (changedIds.length) onActionUpdate(changedIds, updatedList);
        } catch {}
      }
    },
    [
      editing,
      getNextTransitionValue,
      keyFromEventAction,
      onActionUpdate,
      pruneTransitionKeys,
      setThings,
      thing,
      things,
    ]
  );
}
