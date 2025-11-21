import { useCallback, useRef } from "react";

import {
  EventActionType,
  FieldType,
  Name,
  TransitionType,
  ValueType,
  Thing,
  getValue,
} from "@/lib/objax";

type TransitionKey = string;

export function useTransitionIndex() {
  const indexRef = useRef<Map<TransitionKey, number>>(new Map());

  const keyFromEventAction = useCallback((ea: EventActionType): TransitionKey => {
    return `${(ea.transition.path[0] as Name).name}:${
      (ea.transition.path[1] as Name).name
    }`;
  }, []);

  const pruneKeys = useCallback(
    (keys: Iterable<TransitionKey>) => {
      const keep = new Set(keys);
      for (const key of Array.from(indexRef.current.keys())) {
        if (!keep.has(key)) {
          indexRef.current.delete(key);
        }
      }
    },
    []
  );

  const getNextValue = useCallback(
    (
      ea: EventActionType,
      transition: TransitionType,
      field: FieldType,
      things: Thing[]
    ): ValueType | undefined => {
      const transitionKey = keyFromEventAction(ea);
      const fieldValue = getValue(things, field.value);
      const indexFromValue = transition?.states?.findIndex((i) => {
        return getValue(things, i) === fieldValue;
      });
      if (indexFromValue === undefined) {
        return;
      }
      const savedIndex = indexRef.current.get(transitionKey);
      const currentIndex =
        savedIndex !== undefined &&
        savedIndex < transition.states.length &&
        getValue(things, transition.states[savedIndex]) === fieldValue
          ? savedIndex
          : indexFromValue;
      const nextIndex =
        currentIndex === -1
          ? 0
          : currentIndex < transition.states.length - 1
          ? currentIndex + 1
          : 0;
      indexRef.current.set(transitionKey, nextIndex);
      return transition.states[nextIndex];
    },
    [keyFromEventAction]
  );

  return {
    getNextValue,
    keyFromEventAction,
    pruneKeys,
  };
}
