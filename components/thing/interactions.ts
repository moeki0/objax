/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef } from "react";
import { Runtime } from "@/lib/objax/runtime";
import { Thing } from "@/lib/objax/type";
import { load } from "@/lib/objax/runtime/load";
import { rewritePosInCode } from "@/lib/objax/runtime/rewrite-pos-in-code";
import { rewriteSizeInCode } from "@/lib/objax/runtime/rewrite-size-in-code";
import { rewriteStickyInCode } from "@/lib/objax/runtime/rewrite-sticky-in-code";
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
      if (!editor) {
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
                worldOffset.x
            ),
            y: Math.round(
              scrollContainer.scrollTop +
                ev.clientY -
                containerRect.top -
                startYInRect -
                worldOffset.y
            ),
          };
        }
        return {
          x: Math.round(
            window.scrollX + ev.clientX - startXInRect - worldOffset.x
          ),
          y: Math.round(
            window.scrollY + ev.clientY - startYInRect - worldOffset.y
          ),
        };
      };

      const handleMove = (ev: PointerEvent) => {
        const { x, y } = getWorldCoords(ev);
        const relX = parentLayout ? x - parentLayout.x : x;
        const relY = parentLayout ? y - parentLayout.y : y;
        lastRelRef.current = { x: relX, y: relY };
        const code = rewritePosInCode({
          code: lastCodeRef.current,
          x: relX - WORLD_OFFSET,
          y: relY - WORLD_OFFSET,
        });
        lastCodeRef.current = code;
        const result = load(code);
        runtime.update({ id: thing.id, input: { ...result, code } });
        onLiveUpdate?.({ id: thing.id, ...result, code });
      };

      const handleUp = () => {
        const absX = parentBoundsRef.current
          ? parentBoundsRef.current.x + lastRelRef.current.x
          : lastRelRef.current.x;
        const absY = parentBoundsRef.current
          ? parentBoundsRef.current.y + lastRelRef.current.y
          : lastRelRef.current.y;

        const isDescendant = (candidate: Thing) => {
          let cur: Thing | undefined = candidate;
          const seen = new Set<string>();
          while (cur?.sticky) {
            if (seen.has(cur.sticky)) break;
            if (cur.sticky === thing.name) return true;
            seen.add(cur.sticky);
            const next = things.find((t) => t.name === cur?.sticky);
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
          const codeWithSticky = rewriteStickyInCode({
            code: lastCodeRef.current,
            sticky: candidateParent.t.name,
          });
          const code = rewritePosInCode({
            code: codeWithSticky,
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

        if (parentBoundsRef.current) {
          const parent = parentBoundsRef.current;
          const overlaps = !(
            absX + layout.width < parent.x ||
            parent.x + parent.width < absX ||
            absY + layout.height < parent.y ||
            parent.y + parent.height < absY
          );
          if (!overlaps) {
            const codeWithoutSticky = rewriteStickyInCode({
              code: lastCodeRef.current,
              sticky: undefined,
            });
            const code = rewritePosInCode({
              code: codeWithoutSticky,
              x: absX,
              y: absY,
            });
            lastCodeRef.current = code;
            const result = load(code);
            runtime.update({ id: thing.id, input: { ...result, code } });
            onLiveUpdate?.({ id: thing.id, ...result, code });
          }
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
      layout.width,
      layout.height,
      layouts.byId,
    ]
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!editor) {
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
    [runtime, thing, fieldValue]
  );

  return { handlePointerDown, handleResizePointerDown };
}
