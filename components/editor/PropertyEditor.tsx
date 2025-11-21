"use client";
import { Thing } from "@/lib/objax";

export function PropertyEditor({
  selected,
  things,
  updateThing,
  upsertFieldOnThing,
}: {
  selected: Thing;
  things: Thing[];
  updateThing: (mutator: (t: Thing) => Thing) => void;
  upsertFieldOnThing: (t: Thing, field: string, value: any) => Thing;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className="col-span-2 font-semibold text-sm">Properties</div>
      <label className="text-xs text-gray-600">Name</label>
      <input
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={selected.name || ""}
        onChange={(e) => updateThing((t) => ({ ...t, name: e.target.value || "" }))}
      />
      <label className="text-xs text-gray-600">Sticky</label>
      <select
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={selected.sticky || ""}
        onChange={(e) => updateThing((t) => ({ ...t, sticky: e.target.value || undefined }))}
      >
        <option value="">(none)</option>
        {things
          .filter((x) => x.id !== selected.id)
          .map((x) => (
            <option key={x.id} value={x.name}>
              {x.name}
            </option>
          ))}
      </select>
      <label className="text-xs text-gray-600">X</label>
      <input
        type="number"
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={selected.x ?? 0}
        onChange={(e) => updateThing((t) => ({ ...t, x: Number(e.target.value) }))}
      />
      <label className="text-xs text-gray-600">Y</label>
      <input
        type="number"
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={selected.y ?? 0}
        onChange={(e) => updateThing((t) => ({ ...t, y: Number(e.target.value) }))}
      />
      <label className="text-xs text-gray-600">Width</label>
      <input
        type="number"
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={selected.width ?? 200}
        onChange={(e) => updateThing((t) => ({ ...t, width: Number(e.target.value) }))}
      />
      <label className="text-xs text-gray-600">Height</label>
      <input
        type="number"
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={selected.height ?? 200}
        onChange={(e) => updateThing((t) => ({ ...t, height: Number(e.target.value) }))}
      />
      <label className="text-xs text-gray-600">Visible</label>
      <input
        type="checkbox"
        checked={!!(selected.fields || []).find((f: any) => f?.name?.name === "visible")?.value?.value}
        onChange={(e) => updateThing((t) => upsertFieldOnThing(t, "visible", e.target.checked))}
      />
      <label className="text-xs text-gray-600">Editable</label>
      <input
        type="checkbox"
        checked={!!(selected.fields || []).find((f: any) => f?.name?.name === "editable")?.value?.value}
        onChange={(e) => updateThing((t) => upsertFieldOnThing(t, "editable", e.target.checked))}
      />
      <label className="text-xs text-gray-600">Movable</label>
      <input
        type="checkbox"
        checked={!!(selected.fields || []).find((f: any) => f?.name?.name === "movable")?.value?.value}
        onChange={(e) => updateThing((t) => upsertFieldOnThing(t, "movable", e.target.checked))}
      />
      <label className="text-xs text-gray-600">Text</label>
      <input
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={(selected.fields || []).find((f: any) => f?.name?.name === "text")?.value?.value || ""}
        onChange={(e) => updateThing((t) => upsertFieldOnThing(t, "text", e.target.value))}
      />
      <label className="text-xs text-gray-600">Image URL</label>
      <input
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={(selected.fields || []).find((f: any) => f?.name?.name === "image")?.value?.value || ""}
        onChange={(e) => updateThing((t) => upsertFieldOnThing(t, "image", e.target.value))}
      />
      <label className="text-xs text-gray-600">Font Size</label>
      <input
        type="number"
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={Number((selected.fields || []).find((f: any) => f?.name?.name === "fontSize")?.value?.value) || 16}
        onChange={(e) => updateThing((t) => upsertFieldOnThing(t, "fontSize", Number(e.target.value)))}
      />
      <label className="text-xs text-gray-600">Font Family</label>
      <select
        className="border bg-white border-gray-300 rounded px-2 py-1"
        value={(selected.fields || []).find((f: any) => f?.name?.name === "fontFamily")?.value?.value || ""}
        onChange={(e) => updateThing((t) => upsertFieldOnThing(t, "fontFamily", e.target.value))}
      >
        <option value="">(default)</option>
        <option value="Henny Penny">Henny Penny</option>
        <option value="serif">Serif</option>
        <option value="sans-serif">Sans Serif</option>
        <option value="monospace">Monospace</option>
      </select>
      <label className="text-xs text-gray-600">Color</label>
      <input
        type="color"
        className="border bg-white border-gray-300 rounded px-2 py-1 h-9"
        value={(selected.fields || []).find((f: any) => f?.name?.name === "color")?.value?.value || "#000000"}
        onChange={(e) => updateThing((t) => upsertFieldOnThing(t, "color", e.target.value))}
      />
    </div>
  );
}

