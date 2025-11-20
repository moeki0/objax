import { Thing } from "@/lib/objax";
import { useMemo, useState } from "react";
import Fuse from "fuse.js";

const fuseOptions = {
  keys: ["name"],
};

export function ThingList({
  things,
  selected,
  setSelected,
}: {
  things: Thing[];
  selected: Thing | null;
  setSelected: (t: Thing) => void;
}) {
  const [query, setQuery] = useState("");
  const fuse = useMemo(() => new Fuse(things, fuseOptions), [things]);
  const filtered = useMemo(() => {
    if (query.length > 0) {
      return fuse.search(query).map((s) => s.item);
    } else {
      return things;
    }
  }, [fuse, query, things]);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs text-gray-500">Things</div>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          className="bg-white border border-gray-300 px-1 py-1 rounded"
          placeholder="search"
        />
      </div>
      <div className="flex flex-col gap-1 pr-1">
        {filtered.map((t) => {
          const isSelected = t.id === selected?.id;
          const label = t.name?.toString?.() || "(untitled)";
          return (
            <button
              key={t.id}
              type="button"
              className={`text-left w-full px-2 border-gray-300 cursor-pointer py-1 border rounded bg-white hover:bg-gray-50 ${
                isSelected ? "border-sky-600 bg-blue-50" : ""
              }`}
              onClick={() => setSelected(t)}
              title={label}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
