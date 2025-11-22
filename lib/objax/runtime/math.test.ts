import { describe, expect, it } from "vitest";

import { load } from "./load";
import { getValue } from "./get-value";
import { Thing } from "../type";

const lines = (...parts: string[]) => parts.join("\n");

describe("math syntax and evaluation", () => {
  const code = lines(
    "name is MessageData",
    "powA is 2 ^ 3",
    "powB is 2 ** 4",
    "modA is 10 % 3",
    "decA is 0.25",
    'list is ["foo", "list", "bar"]',
    "sinA is sin(pi / 2)",
    "cosA is cos(0)",
    "sqrtA is sqrt(9)",
    "absA is abs(-5)",
    "floorA is floor(1.8)",
    "ceilA is ceil(1.2)",
    "minA is min(5, 2, 3)",
    "maxA is max(1, 9, 4)",
    "logA is log(e)",
    "expA is exp(1)",
    "indexA is MessageData.list.2"
  );

  const loaded = load(code);
  const thing: Thing = {
    id: "math",
    code,
    users: [],
    ...loaded,
  };
  const things = [thing];
  const fieldValue = (name: string) =>
    getValue(
      things,
      thing.fields?.find((f) => f.name.name === name)?.value as any
    );

  it("evaluates arithmetic extensions", () => {
    expect(fieldValue("powA")).toBe(8);
    expect(fieldValue("powB")).toBe(16);
    expect(fieldValue("modA")).toBe(1);
    expect(fieldValue("decA")).toBeCloseTo(0.25);
  });

  it("evaluates math functions and constants", () => {
    expect(fieldValue("sinA")).toBeCloseTo(1);
    expect(fieldValue("cosA")).toBeCloseTo(1);
    expect(fieldValue("sqrtA")).toBeCloseTo(3);
    expect(fieldValue("absA")).toBe(5);
    expect(fieldValue("floorA")).toBe(1);
    expect(fieldValue("ceilA")).toBe(2);
    expect(fieldValue("minA")).toBe(2);
    expect(fieldValue("maxA")).toBe(9);
    expect(fieldValue("logA")).toBeCloseTo(1);
    expect(fieldValue("expA")).toBeCloseTo(Math.E);
    expect(fieldValue("indexA")).toBe("list");
  });
});
