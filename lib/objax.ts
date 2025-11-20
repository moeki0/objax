import { parse } from "./lang";

export interface Name {
  type: "Name";
  name: string;
}

export interface StringType {
  type: "String";
  value: string;
}

export interface BooleanType {
  type: "Boolean";
  value: boolean;
}

export interface FieldValueType {
  type: "Reference";
  path: Name[];
}

export interface EqType {
  type: "Eq";
  left: FieldValueType;
  right: ValueType;
}

export interface EventActionType {
  type: "EventAction";
  name: Name;
  transition: FieldValueType;
}

export interface TransitionType {
  type: "Transition";
  name: Name;
  states: ValueType[];
  field: FieldValueType;
}

export interface FieldType {
  type: "Field";
  name: Name;
  value: ValueType;
}

export interface VisibleType {
  type: "Visible";
  value: ValueType;
}

export interface Duplicate {
  type: "Duplicate";
  name: Name;
}

export interface OrType {
  type: "Or";
  left: ValueType;
  right: ValueType;
}

export interface AndType {
  type: "And";
  left: ValueType;
  right: ValueType;
}

export interface BinaryOp {
  type: "BinaryOp";
  left: ValueType;
  right: ValueType;
  op: string;
}

export interface NotType {
  type: "Not";
  operand: ValueType;
}

export interface IntegerType {
  type: "Integer";
  value: number;
}

export type ValueType =
  | BooleanType
  | StringType
  | IntegerType
  | BinaryOp
  | FieldValueType
  | EqType
  | OrType
  | AndType
  | NotType;

export interface Thing {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  code?: string;
  name: string;
  lastValidCode?: string;
  sticky?: string;
  eventActions?: EventActionType[];
  transitions?: TransitionType[];
  fields?: FieldType[];
  duplicate?: Duplicate;
}

export function getField(
  things: Thing[],
  thing: string,
  field: string
): FieldType | undefined {
  return things
    .find((t) => t.name === thing)
    ?.fields?.find((f) => f.name.name === field);
}

export function getValue(
  things: Thing[],
  t: ValueType | EqType
): boolean | string | number | undefined {
  if (t.type === "Eq") {
    return getValue(things, t.left) === getValue(things, t.right);
  } else if (t.type === "Or") {
    const l = getValue(things, t.left);
    const r = getValue(things, t.right);
    return Boolean(l) || Boolean(r);
  } else if (t.type === "And") {
    const l = getValue(things, t.left);
    const r = getValue(things, t.right);
    return Boolean(l) && Boolean(r);
  } else if (t.type === "Not") {
    const v = getValue(things, t.operand);
    return !Boolean(v);
  } else if (t.type === "BinaryOp") {
    const left = Number(getValue(things, t.left));
    const right = Number(getValue(things, t.right));
    if (t.op === "+") {
      return left + right;
    } else if (t.op === "-") {
      return left - right;
    } else if (t.op === "*") {
      return left * right;
    } else if (t.op === "/") {
      return left / right;
    }
  } else if (t.type === "Reference") {
    const field = getField(things, t.path[0].name, t.path[1]?.name);
    if (!field) {
      return undefined;
    }
    return getValue(things, field.value);
  } else {
    return t.value;
  }
}

export function getTransition(
  things: Thing[],
  thing: string,
  transition: string
): TransitionType | undefined {
  return things
    ?.find((t) => t.name === thing)
    ?.transitions?.find((t) => {
      return t.name.name === transition;
    });
}

export function getThing(code: string): Thing {
  const result = parse(code);
  function find(type: string) {
    return result.find((r: { type: string }) => r.type === type);
  }
  function filter(type: string) {
    return result.filter((r: { type: string }) => r.type === type);
  }
  return {
    name: find("DefName").value.name,
    fields: filter("DefField"),
    transitions: filter("Transition"),
    eventActions: filter("EventAction"),
    sticky: find("Sticky")?.name.name,
    duplicate: find("Duplicate"),
  };
}
