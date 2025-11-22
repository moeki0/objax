/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Runtime } from "@/lib/objax/runtime";
import { getField } from "@/lib/objax/runtime/get-field";
import { Thing } from "@/lib/objax/type";
import { useCallback, useEffect, useState } from "react";
import { EditorComponent } from "./Editor";
import { getValue } from "@/lib/objax/runtime/get-value";
import { load } from "@/lib/objax/runtime/load";
import { rewriteFieldInCode } from "@/lib/objax/runtime/rewrite-field-in-code";
import { useThingLayouts } from "./thing/layout";
import { useThingInteractions } from "./thing/interactions";

export function ThingComponent({
  things,
  thing,
  runtime,
  onLiveUpdate,
}: {
  things: Thing[];
  thing: Thing;
  runtime: Runtime;
  onLiveUpdate?: (payload: any) => void;
}) {
  const [editor, setEditor] = useState(false);
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      runtime.handle({ thing, event: `keydown${e.key}` });
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [runtime, thing]);
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
  const layout = layouts.byId.get(thing.id) ?? {
    x: Number(v("x") ?? 0),
    y: Number(v("y") ?? 0),
    width: Number(v("width") ?? 0),
    height: Number(v("height") ?? 0),
    depth: 0,
  };
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
    layout,
    layouts,
    parentLayout,
    fieldValue,
    onLiveUpdate,
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

  const handleTextChange = (value: string) => {
    const code = rewriteFieldInCode({ code: thing.code, field: "text", value });
    const result = load(code);
    runtime.update({ id: thing.id, input: { ...result, code } });
  };

  return (
    <>
      {editor && (
        <EditorComponent
          key={thing.id}
          thing={things.find((t) => t.id === thing.id)!}
          runtime={runtime}
        />
      )}
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
          style={{
            height: `${v("height")}px`,
            width: `${v("width")}px`,
            left: `${layout.x}px`,
            top: `${layout.y}px`,
            zIndex: 100 + (layout.depth ?? 0),
            ...style(),
          }}
        >
          {isEditable ? (
            <textarea
              defaultValue={text}
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
