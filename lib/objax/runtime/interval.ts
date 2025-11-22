import { INTERVAL } from ".";
import { Thing } from "../type";
import { action } from "./action";
import { getInterval } from "./get-interval";
import { World } from "./world";

export function interval({
  t,
  frame,
  world,
}: {
  t: Thing;
  frame: number;
  world: World;
}) {
  t.eventActions?.forEach((ea) => {
    const interval = getInterval(ea);
    if (!interval) {
      return;
    }
    if (frame % Math.max(1, Math.round(interval / INTERVAL)) === 0) {
      action({ things: world.things, ea });
    }
  });
}
