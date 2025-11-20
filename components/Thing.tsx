import {
  EventActionType,
  getValue,
  getField,
  getTransition,
  Thing,
  FieldType,
  ValueType,
  TransitionType,
} from "@/lib/objax";
import {
  CSSProperties,
  Dispatch,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { generateStyle } from "./generate-style";

export function ThingComponent({
  thing,
  setThings,
  setSelected,
  selected,
  things,
  editing,
  scrollLeft = 0,
  scrollTop = 0,
  onGeometryChange,
  onGeometryCommit,
}: {
  thing: Thing;
  things: Thing[];
  selected: Thing | null;
  setThings: Dispatch<SetStateAction<Thing[]>>;
  setSelected: Dispatch<SetStateAction<Thing | null>>;
  editing: boolean;
  scrollLeft?: number;
  scrollTop?: number;
  onGeometryChange?: (id: string) => void;
  onGeometryCommit?: (id: string) => void;
}) {
  const [size, setSize] = useState({
    width: thing.width ?? 200,
    height: thing.height ?? 200,
  });
  const [clickedPos, setClickedPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const lastEmitRef = useRef(0);
  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement, MouseEvent>) => {
    const movableField = getField(things, thing.name, "movable");
    const movable = movableField ? getValue(things, movableField.value) : false;
    if (!editing && !movable) {
      return;
    }
    setSelected(thing);
    if (isResizing) return;
    setIsDragging(true);
    setClickedPos({
      x: e.clientX - e.currentTarget.getBoundingClientRect().x,
      y: e.clientY - e.currentTarget.getBoundingClientRect().y,
    });
  };

  const handleResizeMouseDown = (
    e: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.stopPropagation();
    setSelected(thing);
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: size.width, height: size.height });
  };

  useEffect(() => {
    const handleMouseUp = () => {
      const wasDragging = isDragging;
      const wasResizing = isResizing;
      if (isDragging) setIsDragging(false);
      if (isResizing) setIsResizing(false);
      // Notify end-of-geometry change so the caller can persist
      if ((wasDragging || wasResizing) && onGeometryCommit) {
        try {
          onGeometryCommit(thing.id!);
        } catch {}
      }
    };
    const handleDrag = (e: MouseEvent) => {
      if (isDragging) {
        const x = e.clientX + scrollLeft - clickedPos.x;
        const y = e.clientY + scrollTop - clickedPos.y;
        setThings((prev) => {
          const parent = thing.sticky
            ? prev.find((t) => t.name === thing.sticky)
            : undefined;
          const getAbsPos = (
            t: Thing | undefined,
            seen = new Set<string>()
          ): {
            x: number;
            y: number;
          } => {
            if (!t) return { x: 0, y: 0 };
            if (seen.has(t.name)) return { x: 0, y: 0 };
            t.x ||= 0;
            t.y ||= 0;
            seen.add(t.name);
            if (t.sticky) {
              const pt = prev.find((pp) => pp.name === t.sticky);
              const parentPos = getAbsPos(pt, seen);
              return { x: parentPos.x + t.x, y: parentPos.y + t.y };
            }
            return {
              x: t.x,
              y: t.y,
            };
          };
          const parentAbs = getAbsPos(parent);
          return prev.map((p) => {
            if (p.id === thing.id) {
              if (parent) {
                return {
                  ...p,
                  x: x - parentAbs.x,
                  y: y - parentAbs.y,
                };
              }
              return {
                ...p,
                x,
                y,
              };
            }
            return p;
          });
        });
        if (onGeometryChange) {
          const now = Date.now();
          if (now - lastEmitRef.current > 60) {
            lastEmitRef.current = now;
            try {
              onGeometryChange(thing.id!);
            } catch {}
          }
        }
      } else if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        const width = Math.max(32, initialSize.width + dx);
        const height = Math.max(32, initialSize.height + dy);
        setSize({ width, height });
        setThings((prev) =>
          prev.map((p) =>
            p.name === thing.name
              ? {
                  ...p,
                  width,
                  height,
                }
              : p
          )
        );
        if (onGeometryChange) {
          const now = Date.now();
          if (now - lastEmitRef.current > 60) {
            lastEmitRef.current = now;
            try {
              console.log(thing);
              onGeometryChange(thing.id!);
            } catch {}
          }
        }
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleDrag);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleDrag);
    };
  }, [
    clickedPos,
    clickedPos.x,
    clickedPos.y,
    initialSize.height,
    initialSize.width,
    isDragging,
    isResizing,
    resizeStart.x,
    resizeStart.y,
    setThings,
    thing.height,
    thing.id,
    thing.name,
    thing.sticky,
    thing.width,
  ]);

  const isDisplayed = useMemo(() => {
    const isDisplayed = (t: Thing): boolean => {
      const parent = t.sticky
        ? things.find((tt) => tt.name === t.sticky)
        : undefined;
      const devOnlyField = getField(things, thing.name, "devOnly");
      const devOnly = devOnlyField
        ? getValue(things, devOnlyField.value)
        : false;
      if (devOnly && editing) {
        return true;
      }
      if (devOnly && !editing) {
        return false;
      }
      const visibleField = getField(things, t.name, "visible");
      const visible =
        selected?.id === t.id && editing
          ? true
          : visibleField
          ? !!getValue(things, visibleField.value)
          : parent
          ? isDisplayed(parent)
          : true;
      return visible;
    };
    return isDisplayed(thing);
  }, [thing, things, editing, selected]);

  const getAbsolutePos = (
    t: Thing,
    seen = new Set<string>()
  ): { x: number; y: number } => {
    t.x ||= 0;
    t.y ||= 0;
    if (seen.has(t.name)) return { x: t.x, y: t.y };
    seen.add(t.name);
    if (t.sticky) {
      const parent = things.find((tt) => tt.name === t.sticky);
      if (parent) {
        const pAbs = getAbsolutePos(parent, seen);
        return { x: pAbs.x + t.x, y: pAbs.y + t.y };
      }
    }
    return { x: t.x, y: t.y };
  };
  const handleClick = () => {
    const devOnlyField = getField(things, thing.name, "devOnly");
    const devOnly = devOnlyField ? getValue(things, devOnlyField.value) : false;
    if (editing && !devOnly) {
      return;
    }
    const eas = thing.eventActions?.filter((ea) => ea.name.name === "touch");
    const results: {
      ea: EventActionType;
      transition: TransitionType;
      value: ValueType;
      field: FieldType;
    }[] = [];
    eas?.forEach((ea) => {
      const transition = getTransition(
        things,
        ea.transition.path[0].name,
        ea.transition.path[1].name
      );
      if (!transition) {
        return;
      }
      const field = getField(
        things,
        transition.field.path[0].name,
        transition.field.path[1].name
      );
      if (!field) {
        return;
      }
      const index = transition?.states.findIndex((i) => {
        return getValue(things, i) === getValue(things, field.value);
      });
      if (index === undefined) {
        return;
      }
      const nextIndex =
        index === -1
          ? 0
          : index < transition!.states.length - 1
          ? index + 1
          : 0;
      const value = transition?.states[nextIndex];
      results.push({ ea, value, field, transition });
    });

    setThings((prev) => {
      return prev.map((p) => {
        const target = results.find(
          (r) => p.name === r.transition.field.path[0].name
        );
        if (target) {
          return {
            ...p,
            fields: p.fields?.map((f) => {
              if (f.name.name === target.transition.field.path[1].name) {
                return { ...f, value: target.value };
              }
              return f;
            }),
          };
        }
        return p;
      });
    });
  };
  const text = useMemo(() => {
    const t = thing.fields?.find((f) => f.name.name === "text");
    if (!t) {
      return "";
    }
    if (!t.value) {
      return "";
    }
    if (t.value.type === "String") {
      return t.value.value;
    }
    if (t.value.type === "Reference") {
      const field = getField(
        things,
        t.value.path[0].name,
        t.value.path[1]?.name
      )?.value;
      if (!field) {
        return "";
      }
      return getValue(things, field);
    }
  }, [things, thing]);

  const fontSize = getField(things, thing.name, "fontSize");
  const fontFamily = getField(things, thing.name, "fontFamily");
  const style: CSSProperties = useMemo(
    () => generateStyle({ things, thing }),
    [things, thing]
  );
  const image = getField(things, thing.name, "image");

  return (
    <div
      className={`border ${thing.sticky ? "z-50" : ""} ${
        editing
          ? "bg-slate-300/50 border-dashed!"
          : "border-transparent border-dashed"
      } inline-block select-none absolute ${
        fontFamily && getValue(things, fontFamily.value) === "Henny Penny"
          ? "henny-penny-regular"
          : ""
      }`}
      style={{
        left: `${getAbsolutePos(thing).x}px`,
        top: `${getAbsolutePos(thing).y}px`,
        width: `${thing.width}px`,
        height: `${thing.height}px`,
        display: isDisplayed ? "block" : "none",
        fontSize: `${fontSize}px`,
        ...style,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`h-full w-full ${
          editing
            ? "cursor-move"
            : thing.eventActions?.find(
                (ea: EventActionType) => ea.name?.name === "touch"
              )
            ? "cursor-pointer"
            : ""
        }`}
        onClick={handleClick}
      >
        <div className="flex justify-center flex-col gap-2 items-center h-full w-full p-1">
          {text}
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(getValue(things, image.value))}
              alt={thing.name ?? "generated image"}
              className="w-full h-full object-cover rounded"
              draggable={false}
            />
          )}
        </div>
      </div>
      <div
        className={`absolute bottom-0 right-0 w-3 h-3 ${
          editing ? "cursor-se-resize" : ""
        }`}
        onMouseDown={handleResizeMouseDown}
        title="Resize"
      ></div>
    </div>
  );
}
