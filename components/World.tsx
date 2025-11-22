"use client";

import { useMemo } from "react";
import { ThingComponent } from "./Thing";
import { useWorld } from "./hooks/useWorld";
import { useHotkeys } from "react-hotkeys-hook";

export function WorldComponent({ id }: { id: string }) {
  const init = useMemo(
    () => ({
      id,
      name: "Sample",
      things: [],
    }),
    [id]
  );
  const runtime = useWorld({ init });
  useHotkeys("ctrl+n", () => runtime?.add({}));

  if (!runtime) {
    return;
  }

  const world = runtime.world;

  return (
    <div>
      {world.things.map((thing) => (
        <ThingComponent
          key={thing.id}
          thing={thing}
          things={world.things}
          runtime={runtime}
        />
      ))}
    </div>
  );
}
