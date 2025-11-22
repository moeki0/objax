import { Listener } from ".";
import { interval } from "./interval";
import { World } from "./world";
let frame = 0;

export function render({
  world,
  listeners,
}: {
  world: World;
  listeners: Set<Listener>;
}) {
  world.things.forEach((t) => {
    interval({ t, world, frame });
  });
  listeners.forEach((l) => l());
  frame++;
}
