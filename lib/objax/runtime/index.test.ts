import { describe, expect, it } from "vitest";

import { load } from "./load";
import { World } from "./world";

describe("index", () => {
  it("world", () => {
    const world: World = {
      id: "sample",
      name: "Sample",
      things: [],
    };
    world.things.push({
      id: "first-code",
      name: "Alpha",
      code: `name is Alpha
title = "hello"
count = 42`,
    });
    world.things = world.things.map((thing) => {
      return {
        ...thing,
        ...load(thing.code),
      };
    });
    expect(world.things.length).toBe(1);
  });
});
