import { parse } from "../parser";
import {
  Duplicate,
  EventActionType,
  FieldType,
  OperationType,
  TransitionType,
} from "../type";

export interface LoadedThing {
  name: string;
  parent?: string;
  parentExpr?: any;
  eventActions: EventActionType[];
  transitions: TransitionType[];
  operations: OperationType[];
  fields: FieldType[];
  duplicate?: Duplicate;
}

export function load(code: string): LoadedThing {
  const result = parse(code);
  function find(type: string) {
    return result.find((r: { type: string }) => r.type === type);
  }
  function filter(type: string) {
    return result.filter((r: { type: string }) => r.type === type);
  }
  const parentNode: any = (find("Parent") as any)?.value;
  let parentName: string | undefined;
  if (parentNode?.type === "NameLiteral") parentName = parentNode.value;
  if (parentNode?.type === "String") parentName = parentNode.value;

  return {
    name: find("DefName").value.name,
    fields: filter("DefField"),
    transitions: filter("Transition"),
    eventActions: filter("EventAction"),
    operations: filter("Operation"),
    parent: parentName,
    parentExpr: parentNode,
    duplicate: find("Duplicate"),
  };
}
