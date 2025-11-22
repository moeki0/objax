import { describe, expect, it } from "vitest";

import { load } from "./load";
import { BinaryOp, Name, NotType } from "../type";

const lines = (...parts: string[]) => parts.join("\n");

describe("load", () => {
  it("名前とフィールドを集約できる", () => {
    const result = load(
      lines("name is Alpha", 'title = "hello"', "count = 42")
    );

    expect(result.name).toBe("Alpha");
    expect(result.fields).toEqual([
      {
        type: "DefField",
        name: { type: "Name", name: "title" },
        value: { type: "String", value: "hello" },
      },
      {
        type: "DefField",
        name: { type: "Name", name: "count" },
        value: { type: "Integer", value: 42 },
      },
    ]);
  });

  it("stickyとduplicateを保持する", () => {
    const result = load(
      lines("name is Bravo", "sticky pinned", "duplicate twin")
    );

    expect(result.sticky).toBe("pinned");
    expect(result.duplicate).toEqual({
      type: "Duplicate",
      name: { type: "Name", name: "twin" },
    });
  });

  it("イベントアクション名を小文字化して返す", () => {
    const result = load(
      lines("name is Clicker", "onClick is Foo.Bar", "onHover is User.State")
    );

    expect(result.eventActions).toHaveLength(2);
    expect(result.eventActions[0]).toMatchObject({
      type: "EventAction",
      name: { type: "Name", name: "click" },
      transition: {
        type: "Reference",
        path: [
          { type: "Name", name: "Foo" },
          { type: "Name", name: "Bar" },
        ],
      },
    });
    expect(result.eventActions[1].name.name).toBe("hover");
  });

  it("トランジションの範囲を展開した配列で返す", () => {
    const result = load(
      lines(
        "name is Delta",
        "transition slide of camera.z is [3..1, 0]",
        "transition hop of user.state is [0..2]"
      )
    );

    const slide = result.transitions.find(
      (t) => t.name.name === "slide"
    ) as NonNullable<(typeof result.transitions)[number]>;
    expect(slide.states).toEqual([
      { type: "Integer", value: 3 },
      { type: "Integer", value: 2 },
      { type: "Integer", value: 1 },
      { type: "Integer", value: 0 },
    ]);

    const hop = result.transitions.find((t) => t.name.name === "hop");
    expect(hop?.states.map((s) => (s as { value: number }).value)).toEqual([
      0, 1, 2,
    ]);
  });

  it("operationのBlock内の式を保持する", () => {
    const result = load(
      lines("name is Echo", "operation calc of target.value is { 1 + 2 * 3 }")
    );

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      type: "Operation",
      name: { type: "Name", name: "calc" },
      field: {
        type: "Reference",
        path: [
          { type: "Name", name: "target" },
          { type: "Name", name: "value" },
        ],
      },
      block: {
        type: "Block",
        expr: {
          type: "BinaryOp",
          op: "+",
          left: { type: "Integer", value: 1 },
          right: {
            type: "BinaryOp",
            op: "*",
            left: { type: "Integer", value: 2 },
            right: { type: "Integer", value: 3 },
          },
        },
      },
    });
  });

  it("Referenceに数字が含まれてもそのまま保持する", () => {
    const result = load(lines("name is Foxtrot", "path = foo.0.bar.9"));

    expect(result.fields[0]).toEqual({
      type: "DefField",
      name: { type: "Name", name: "path" },
      value: {
        type: "Reference",
        path: [
          { type: "Name", name: "foo" },
          { type: "Integer", value: 0 },
          { type: "Name", name: "bar" },
          { type: "Integer", value: 9 },
        ],
      },
    });
  });

  it("DefNameが複数あっても最初の定義を返す", () => {
    const result = load(
      lines("name is First", "name is Second", "flag = true")
    );

    expect(result.name).toBe("First");
  });

  it("stickyが無い場合はundefinedになる", () => {
    const result = load(lines("name is Golf", "flag = false"));

    expect(result.sticky).toBeUndefined();
    expect(result.duplicate).toBeUndefined();
  });

  it("構文エラーをそのまま送出する", () => {
    expect(() => load("name is")).toThrow();
  });

  it("DefFieldが他の宣言に挟まれても全て集約する", () => {
    const result = load(
      lines(
        "name is Hotel",
        "first = 1",
        "onClick is action.go",
        "second = 2",
        "transition t1 of path.to is [0]"
      )
    );

    expect(result.fields.map((f) => f.name.name)).toEqual(["first", "second"]);
    expect(result.eventActions).toHaveLength(1);
    expect(result.transitions).toHaveLength(1);
  });

  it("It参照を含むoperationでもBlockを保持する", () => {
    const result = load(
      lines("name is India", "operation tick of current.value is { it * 2 }")
    );

    expect(result.operations[0]?.block.expr).toMatchObject({
      type: "BinaryOp",
      op: "*",
      left: { type: "It" },
      right: { type: "Integer", value: 2 },
    });
  });

  it("複数のイベントとトランジションをまとめて返す", () => {
    const result = load(
      lines(
        "name is Juliet",
        "transition alpha of user.state is [0, 1]",
        "transition beta of user.state is [2, 3]",
        "onClick is go.alpha",
        "onHover is go.beta"
      )
    );

    expect(result.transitions.map((t) => t.name.name)).toEqual([
      "alpha",
      "beta",
    ]);
    expect(
      result.eventActions.map((a) => (a.transition.path[1] as Name).name)
    ).toEqual(["alpha", "beta"]);
  });

  it("nameのみでも他の項目は空配列/undefinedになる", () => {
    const result = load("name is Solo");

    expect(result.fields).toEqual([]);
    expect(result.transitions).toEqual([]);
    expect(result.operations).toEqual([]);
    expect(result.eventActions).toEqual([]);
    expect(result.sticky).toBeUndefined();
    expect(result.duplicate).toBeUndefined();
  });

  it("空配列を持つトランジションを処理できる", () => {
    const result = load(
      lines("name is Kilo", "transition idle of user.state is []")
    );

    expect(result.transitions[0]).toMatchObject({
      name: { name: "idle" },
      states: [],
    });
  });

  it("比較と論理式をそのまま保持する", () => {
    const result = load(
      lines("name is Logic", "cond = not a.b and (c.d == 1 or x.y <= 2)")
    );

    const cond = result.fields[0].value as BinaryOp;
    expect(cond.type).toBe("And");
    expect(cond.left.type).toBe("Not");
    expect((cond.left as NotType).operand.type).toBe("Reference");
    expect(cond.right.type).toBe("Or");
    expect((cond.right as BinaryOp).left).toMatchObject({
      type: "Compare",
      op: "==",
      right: { type: "Integer", value: 1 },
    });
    expect((cond.right as BinaryOp).right).toMatchObject({
      type: "Compare",
      op: "<=",
      right: { type: "Integer", value: 2 },
    });
  });

  it("コメントや空行を無視してパースする", () => {
    const result = load(
      lines(
        "# heading",
        "",
        "name is Commented",
        "# skip",
        "value = 10",
        "transition step of path.to is [1]"
      )
    );

    expect(result.name).toBe("Commented");
    expect(result.fields[0]).toMatchObject({
      name: { name: "value" },
      value: { type: "Integer", value: 10 },
    });
    expect(result.transitions[0].name.name).toBe("step");
  });

  it("宣言順のまま配列を返す", () => {
    const result = load(
      lines(
        "name is Order",
        "operation op1 of a.b is { 1 }",
        "transition t1 of x.y is [0]",
        "operation op2 of a.b is { 2 }",
        "onClick is go.t1"
      )
    );

    expect(result.operations.map((o) => o.name.name)).toEqual(["op1", "op2"]);
    expect(result.transitions[0].name.name).toBe("t1");
    expect(result.eventActions[0].name.name).toBe("click");
  });

  it("複数のsticky/duplicateは最初の宣言を採用する", () => {
    const result = load(
      lines(
        "name is Stack",
        "sticky first",
        "sticky second",
        "duplicate one",
        "duplicate two"
      )
    );

    expect(result.sticky).toBe("first");
    expect(result.duplicate?.name.name).toBe("one");
  });

  it("日本語のNameをすべての宣言で扱える", () => {
    const result = load(
      lines(
        "name is 世界",
        "operation 計算 of 対象.値 is { 1 + 1 }",
        "transition 状態遷移 of 利用者.状態 is [0, 1]",
        "onClick is ハンドラ.開始",
        "duplicate 複製"
      )
    );

    expect(result.name).toBe("世界");
    expect(result.operations[0].name.name).toBe("計算");
    expect(result.transitions[0].name.name).toBe("状態遷移");
    expect((result.eventActions[0].transition.path[0] as Name).name).toBe(
      "ハンドラ"
    );
    expect(result.duplicate?.name.name).toBe("複製");
  });

  it("範囲と値が混在する配列を順序を保って展開する", () => {
    const result = load(
      lines("name is Mix", "transition path of a.b is [1, 3..2, 5, 7..9]")
    );

    const states = result.transitions[0].states.map(
      (s) => (s as { value: number }).value
    );
    expect(states).toEqual([1, 3, 2, 5, 7, 8, 9]);
  });

  it("Block内の括弧で演算順を変える式を保持する", () => {
    const result = load(
      lines("name is Paren", "operation calc of x.y is { (1 + 2) * (3 + 4) }")
    );

    const expr = result.operations[0].block.expr as BinaryOp;
    expect(expr.op).toBe("*");
    expect(expr.left).toMatchObject({ type: "BinaryOp", op: "+" });
    expect(expr.right).toMatchObject({ type: "BinaryOp", op: "+" });
  });

  it("name宣言が無いコードは例外を投げる", () => {
    expect(() => load("flag = true")).toThrow();
  });
});
