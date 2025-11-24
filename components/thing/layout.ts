import { useMemo } from "react";
import { Thing } from "@/lib/objax/type";
import { getValue } from "@/lib/objax/runtime/get-value";

export type Layout = {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  parentName?: string;
};

export type LayoutMaps = {
  byId: Map<string, Layout>;
  byName: Map<string, Layout>;
};

export function useThingLayouts({
  things,
  thing,
  fieldValue,
}: {
  things: Thing[];
  thing?: Thing;
  fieldValue: (target: Thing, name: string) => unknown;
}): LayoutMaps {
  return useMemo(() => {
    const byId = new Map<string, Layout>();
    const byName = new Map<string, Thing>();
    things.forEach((t) => byName.set(t.name, t));

    const parentNameOf = (t: Thing) => {
      if (t.parent) return t.parent;
      if (t.parentExpr) {
        const val = getValue(things, t.parentExpr);
        if (typeof val === "string") return val;
      }
      const val = fieldValue(t, "parent");
      if (typeof val === "string") return val;
      return undefined;
    };

    const visit = (t: Thing, depth = 0, stack = new Set<string>()): Layout => {
      if (byId.has(t.id)) return byId.get(t.id)!;
      if (stack.has(t.id)) {
        return {
          x: Number(fieldValue(t, "x") ?? 0),
          y: Number(fieldValue(t, "y") ?? 0),
          width: Number(fieldValue(t, "width") ?? 0),
          height: Number(fieldValue(t, "height") ?? 0),
          depth,
        };
      }
      stack.add(t.id);
      const rawX = Number(fieldValue(t, "x") ?? 0);
      const rawY = Number(fieldValue(t, "y") ?? 0);
      const width = Number(fieldValue(t, "width") ?? 0);
      const height = Number(fieldValue(t, "height") ?? 0);
      const parentName = parentNameOf(t);
      const parent = parentName ? byName.get(parentName) : undefined;
      if (parent) {
        const p = visit(parent, depth + 1, stack);
        const value = {
          x: p.x + rawX,
          y: p.y + rawY,
          width,
          height,
          depth: p.depth + 1,
          parentName: parent.name,
        };
        byId.set(t.id, value);
        stack.delete(t.id);
        return value;
      }
      const value = { x: rawX, y: rawY, width, height, depth };
      byId.set(t.id, value);
      stack.delete(t.id);
      return value;
    };
    things.forEach((t) => visit(t));
    return {
      byId,
      byName: new Map(
        Array.from(byId.entries()).map(([id, layout]) => {
          const target = things.find((t) => t.id === id)!;
          return [target.name, layout];
        })
      ),
    };
  }, [thing, things, fieldValue]);
}
