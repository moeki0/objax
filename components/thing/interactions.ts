/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef } from "react";
import { Runtime } from "@/lib/objax/runtime";
import { Thing } from "@/lib/objax/type";
import { load } from "@/lib/objax/runtime/load";
import { rewritePosInCode } from "@/lib/objax/runtime/rewrite-pos-in-code";
import { rewriteSizeInCode } from "@/lib/objax/runtime/rewrite-size-in-code";
import { rewriteParentInCode } from "@/lib/objax/runtime/rewrite-parent-in-code";
import { Layout, LayoutMaps } from "./layout";
import { WORLD_OFFSET } from "../World";

export function useThingInteractions({
  things,
  thing,
  runtime,
  editor,
  layout,
  layouts,
  parentLayout,
  fieldValue,
  onLiveUpdate,
  scrollContainer,
  worldOffset,
}: {
  things: Thing[];
  thing: Thing;
  runtime: Runtime;
  editor: boolean;
  layout: Layout;
  layouts: LayoutMaps;
  parentLayout?: Layout;
  fieldValue: (target: Thing, name: string) => any;
  onLiveUpdate?: (payload: any) => void;
  scrollContainer?: HTMLDivElement | null;
  worldOffset: { x: number; y: number };
}) {
  const lastCodeRef = useRef(thing.code);
  const lastRelRef = useRef({ x: 0, y: 0 });
  const parentBoundsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const movable = fieldValue(thing, "movable");
      if (!editor && !movable) {
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const startXInRect = e.clientX - rect.x;
      const startYInRect = e.clientY - rect.y;
      lastCodeRef.current = thing.code;
      lastRelRef.current = {
        x: Number(fieldValue(thing, "x") ?? 0),
        y: Number(fieldValue(thing, "y") ?? 0),
      };
      parentBoundsRef.current = parentLayout
        ? {
            x: parentLayout.x,
            y: parentLayout.y,
            width: parentLayout.width,
            height: parentLayout.height,
          }
        : null;

      const getWorldCoords = (ev: { clientX: number; clientY: number }) => {
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          return {
            x: Math.round(
              scrollContainer.scrollLeft +
                ev.clientX -
                containerRect.left -
                startXInRect -
                WORLD_OFFSET +
                worldOffset.x
            ),
            y: Math.round(
              scrollContainer.scrollTop +
                ev.clientY -
                containerRect.top -
                startYInRect -
                WORLD_OFFSET +
                worldOffset.y
            ),
          };
        }
        return {
          x: Math.round(window.scrollX + ev.clientX - startXInRect),
          y: Math.round(window.scrollY + ev.clientY - startYInRect),
        };
      };

      const handleMove = (ev: PointerEvent) => {
        const { x, y } = getWorldCoords(ev);
        const relX = parentLayout ? x - parentLayout.x : x;
        const relY = parentLayout ? y - parentLayout.y : y;
        lastRelRef.current = { x: relX, y: relY };
        const code = rewritePosInCode({
          code: lastCodeRef.current,
          x: relX,
          y: relY,
        });
        console.log(lastCodeRef.current, code);
        lastCodeRef.current = code;
        const result = load(code);
        runtime.update({ id: thing.id, input: { ...result, code } });
        onLiveUpdate?.({ id: thing.id, ...result, code });
      };

      const handleUp = () => {
        const absX = parentBoundsRef.current
          ? parentBoundsRef.current.x + lastRelRef.current.x - WORLD_OFFSET
          : lastRelRef.current.x - WORLD_OFFSET;
        const absY = parentBoundsRef.current
          ? parentBoundsRef.current.y + lastRelRef.current.y - WORLD_OFFSET
          : lastRelRef.current.y - WORLD_OFFSET;

        const isDescendant = (candidate: Thing) => {
          let cur: Thing | undefined = candidate;
          const seen = new Set<string>();
          while (cur?.parent) {
            if (seen.has(cur.parent)) break;
            if (cur.parent === thing.name) return true;
            seen.add(cur.parent);
            const next = things.find((t) => t.name === cur?.parent);
            cur = next;
          }
          return false;
        };

        const candidateParent = things
          .map((t) => ({ t, l: layouts.byId.get(t.id) }))
          .filter(
            ({ t, l }) =>
              t.id !== thing.id &&
              l &&
              absX >= l.x &&
              absX <= l.x + l.width &&
              absY >= l.y &&
              absY <= l.y + l.height &&
              !isDescendant(t)
          )
          .sort((a, b) => (b.l?.depth ?? 0) - (a.l?.depth ?? 0))[0];

        if (
          candidateParent &&
          candidateParent.l &&
          candidateParent.t.name !== layout.parentName
        ) {
          const relX = 0;
          const relY = 0;
          const codeWithParent = rewriteParentInCode({
            code: lastCodeRef.current,
            parent: candidateParent.t.name,
          });
          const code = rewritePosInCode({
            code: codeWithParent,
            x: relX,
            y: relY,
          });
          lastCodeRef.current = code;
          const result = load(code);
          runtime.update({ id: thing.id, input: { ...result, code } });
          onLiveUpdate?.({ id: thing.id, ...result, code });
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
          return;
        }

        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [
      editor,
      thing,
      fieldValue,
      parentLayout,
      scrollContainer,
      worldOffset,
      runtime,
      onLiveUpdate,
      things,
      layout.parentName,
      layouts.byId,
    ]
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const movable = fieldValue(thing, "movable");
      if (!editor && !movable) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      const startWidth = Number(fieldValue(thing, "width") ?? 0);
      const startHeight = Number(fieldValue(thing, "height") ?? 0);
      const startX = e.clientX;
      const startY = e.clientY;

      const handleMove = (ev: PointerEvent) => {
        const width = Math.max(
          10,
          Math.round(startWidth + (ev.clientX - startX))
        );
        const height = Math.max(
          10,
          Math.round(startHeight + (ev.clientY - startY))
        );
        const code = rewriteSizeInCode({ code: thing.code, width, height });
        const result = load(code);
        runtime.update({ id: thing.id, input: { ...result, code } });
        onLiveUpdate?.({ id: thing.id, ...result, code });
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [runtime, thing, fieldValue, onLiveUpdate]
  );

  return { handlePointerDown, handleResizePointerDown };
}
