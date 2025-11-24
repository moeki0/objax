/* eslint-disable @typescript-eslint/no-explicit-any */
import { Name, Thing } from "../type";
import { action } from "./action";
import { add } from "./add";
import { getTransition } from "./get-transition";
import { load } from "./load";
import { render } from "./render";
import { transition } from "./transition";
import { World } from "./world";

const FPS = 60;
export const INTERVAL = 1000 / FPS;

export interface Runtime {
  world: World;
  start: ({
    onUpdate,
  }: {
    onUpdate: ({
      upserts,
      deletes,
    }: {
      upserts: any[];
      deletes: any[];
    }) => Promise<void>;
  }) => void;
  handle: ({ thing, event }: { thing: Thing; event: string }) => void;
  update: ({ id, input }: { id: string; input: Partial<Thing> }) => void;
  subscribe: (listener: Listener) => void;
  add: ({
    input,
  }: {
    input?: Partial<Thing> & { x: number; y: number };
  }) => void;
}

export type Listener = () => void;
const listeners = new Set<Listener>();

export function runtime({ world }: { world: World }): Runtime {
  let ou: ({
    upserts,
    deletes,
  }: {
    upserts: any[];
    deletes: any[];
  }) => Promise<void>;
  return {
    world,
    start: ({ onUpdate }) => {
      world.things = world.things.map((t) => {
        try {
          return { ...t, ...load(t.code) };
        } catch {
          return { ...t };
        }
      });
      ou = onUpdate;
      setInterval(() => render({ world, listeners, onUpdate }), INTERVAL);
    },
    update: ({ id, input }) => {
      world.things = world.things.map((t) => {
        if (t.id === id) {
          ou({ upserts: [{ ...t, ...input }], deletes: [] });
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
        ea.name.name.toLowerCase().match(event.toLowerCase())
      );
      for (const ea of eas) {
        action({ things: world.things, ea });
        const t = world.things.find((tg) => tg.id === thing.id);
        ou({ upserts: [t], deletes: [] });
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add: ({ input }) => add({ input, things: world.things, ou }),
  };
}
