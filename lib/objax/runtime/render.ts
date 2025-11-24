/* eslint-disable @typescript-eslint/no-explicit-any */
import { Listener } from ".";
import { interval } from "./interval";
import { World } from "./world";
let frame = 0;

export function render({
  world,
  listeners,
  onUpdate,
}: {
  world: World;
  listeners: Set<Listener>;
  onUpdate: ({
    upserts,
    deletes,
  }: {
    upserts: any[];
    deletes: any[];
  }) => Promise<void>;
}) {
  world.things.forEach((t) => {
    interval({ t, world, frame, onUpdate });
  });
  listeners.forEach((l) => l());
  frame++;
}
