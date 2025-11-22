import { Thing } from "../type";
import { action } from "./action";
import { add } from "./add";
import { load } from "./load";
import { render } from "./render";
import { World } from "./world";

const FPS = 60;
export const INTERVAL = 1000 / FPS;

export interface Runtime {
  world: World;
  start: () => void;
  handle: ({ thing, event }: { thing: Thing; event: string }) => void;
  update: ({ id, input }: { id: string; input: Partial<Thing> }) => void;
  subscribe: (listener: Listener) => void;
  add: ({ input }: { input?: Partial<Thing> }) => void;
}

export type Listener = () => void;
const listeners = new Set<Listener>();

export function runtime({ world }: { world: World }): Runtime {
  return {
    world,
    start: () => {
      world.things = world.things.map((t) => {
        return { ...t, ...load(t.code) };
      });
      setInterval(() => render({ world, listeners }), INTERVAL);
    },
    update: ({ id, input }) => {
      world.things = world.things.map((t) => {
        if (t.id === id) {
          return { ...t, ...input };
        }
        return t;
      });
    },
    handle: ({ thing, event }) => {
      if (!thing.eventActions) {
        return;
      }
      const eas = thing.eventActions.filter((ea) =>
        ea.name.name.toLowerCase().match(event)
      );
      for (const ea of eas) {
        action({ things: world.things, ea });
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add: ({ input }) => add({ input, things: world.things }),
  };
}
