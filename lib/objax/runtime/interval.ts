/* eslint-disable @typescript-eslint/no-explicit-any */
import { INTERVAL } from ".";
import { Thing } from "../type";
import { action } from "./action";
import { getInterval } from "./get-interval";
import { World } from "./world";

export function interval({
  t,
  frame,
  world,
  onUpdate,
}: {
  t: Thing;
  frame: number;
  world: World;
  onUpdate: ({
    upserts,
    deletes,
  }: {
    upserts: any[];
    deletes: any[];
  }) => Promise<void>;
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
