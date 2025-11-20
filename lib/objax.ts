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

export type ValueType = BooleanType | StringType | FieldValueType | EqType;

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
): boolean | string | undefined {
  if (t.type === "Eq") {
    return getValue(things, t.left) === getValue(things, t.right);
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
    name: (
      (filter("DefField") as FieldType[]).find(
        (f: { name: { name: string } }) => f.name.name === "name"
      )?.value as StringType
    ).value,
    fields: filter("DefField"),
    transitions: filter("Transition"),
    eventActions: filter("EventAction"),
    sticky: find("Sticky")?.name.name,
    duplicate: find("Duplicate"),
  };
}
