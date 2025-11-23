/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Runtime } from "@/lib/objax/runtime";
import { getField } from "@/lib/objax/runtime/get-field";
import { Thing } from "@/lib/objax/type";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorComponent } from "./Editor";
import { getValue } from "@/lib/objax/runtime/get-value";
import { load } from "@/lib/objax/runtime/load";
import { rewriteFieldInCode } from "@/lib/objax/runtime/rewrite-field-in-code";
import { Layout, LayoutMaps, useThingLayouts } from "./thing/layout";
import { useThingInteractions } from "./thing/interactions";

export function ThingComponent({
  things,
  thing,
  runtime,
  onLiveUpdate,
  layoutMaps,
  scrollContainer,
  worldOffset = 0,
  highlighted = false,
}: {
  things: Thing[];
  thing: Thing;
  runtime: Runtime;
  onLiveUpdate?: (payload: any) => void;
  layoutMaps?: LayoutMaps;
  scrollContainer?: HTMLDivElement | null;
  worldOffset?: number;
  highlighted?: boolean;
}) {
  const [editor, setEditor] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      runtime.handle({ thing, event: `keydown${e.key}` });
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [runtime, thing]);
  useEffect(() => {
    setMounted(true);
  }, []);
  const fieldValue = useCallback(
    (target: Thing, name: string) => {
      return getValue(
        things,
        getField(things, target.name, name)?.value as any
      ) as any;
    },
    [things]
  );
  const v = useCallback(
    (name: string) => fieldValue(thing, name),
    [fieldValue, thing]
  );
  const text = String(v("text") ?? "");
  const layouts = useThingLayouts({ things, fieldValue });
  const layout = useMemo<Layout>(() => {
    return (
      layouts.byId.get(thing.id) ?? {
        x: Number(v("x") ?? 0),
        y: Number(v("y") ?? 0),
        width: Number(v("width") ?? 0),
        height: Number(v("height") ?? 0),
        depth: 0,
      }
    );
  }, [layouts, thing.id, v]);
  const parentLayout = layout.parentName
    ? layouts.byName.get(layout.parentName)
    : undefined;
  const isVisible = (() => {
    const visible = fieldValue(thing, "visible");
    if (visible === undefined || visible === null) return true;
    return Boolean(visible);
  })();
  const isEditable = Boolean(fieldValue(thing, "editable"));

  const { handlePointerDown, handleResizePointerDown } = useThingInteractions({
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
  });

  const lowerFirst = (str: string) => {
    if (!str) return str;
    return str[0].toLowerCase() + str.slice(1);
  };
  const style = () => {
    const styleFields =
      thing.fields?.filter((f) => f.name.name.match(/^style.+/)) || [];
    const s: Record<string, string> = {};
    for (const f of styleFields) {
      s[lowerFirst(f.name.name.replace(/^style/, ""))] = v(f.name.name);
    }
    return s;
  };

  const [editing, setEditing] = useState(text);

  const handleTextChange = (value: string) => {
    setEditing(value);
    const code = rewriteFieldInCode({ code: thing.code, field: "text", value });
    const result = load(code);
    runtime.update({ id: thing.id, input: { ...result, code } });
  };

  const [focus, setFocus] = useState(false);

  return (
    <>
      <EditorComponent
        key={thing.id}
        thing={things.find((t) => t.id === thing.id)!}
        runtime={runtime}
        editor={editor}
        setEditor={setEditor}
      />
      {isVisible && (
        <div
          onPointerDown={handlePointerDown}
          className="absolute cursor-default"
          onClick={(e) => {
            runtime.handle({ thing, event: "click" });
            if (e.metaKey) {
              setEditor(!editor);
            }
          }}
          onMouseEnter={() => runtime.handle({ thing, event: "mouseEnter" })}
          onMouseLeave={() => runtime.handle({ thing, event: "mouseLeave" })}
          style={{
            height: `${v("height")}px`,
            width: `${v("width")}px`,
            left: `${layout.x + worldOffset}px`,
            top: `${layout.y + worldOffset}px`,
            zIndex: 100 + (layout.depth ?? 0),
            opacity: mounted ? 1 : 0,
            transition: "opacity 200ms ease-out",
            outline: highlighted ? "2px dashed #2563eb" : undefined,
            outlineOffset: highlighted ? "2px" : undefined,
            ...style(),
          }}
        >
          {isEditable ? (
            <textarea
              value={focus ? editing : text}
              onFocus={() => {
                setEditing(text);
                setFocus(true);
              }}
              onBlur={() => {
                setFocus(false);
                setEditing(text);
              }}
              className="w-full h-full resize-none outline-none p-1"
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          ) : (
            text
          )}
          {v("image") && (
            <img
              alt={text}
              src={v("image")}
              className=" object-cover w-full h-full"
            />
          )}
          <div
            onPointerDown={handleResizePointerDown}
            className="absolute bottom-0 right-0"
            style={{
              width: 24,
              height: 24,
              marginBottom: -6,
              marginRight: -6,
              cursor: "se-resize",
            }}
          />
        </div>
      )}
    </>
  );
}
