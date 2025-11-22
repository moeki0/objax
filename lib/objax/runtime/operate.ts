/* eslint-disable @typescript-eslint/no-explicit-any */
import { Name, OperationType, Thing } from "../type";
import { getField } from "./get-field";
import { getValue } from "./get-value";
import { rewriteValueInCode } from "./rewrite-value-in-code";
import { load } from "./load";

export function operate({
  things,
  operation,
}: {
  things: Thing[];
  operation: OperationType;
}) {
  const newValue = getValue(things, operation.block.expr, operation.field);
  const field = getField(
    things,
    (operation.field.path[0] as Name).name,
    (operation.field.path[1] as Name).name
  );
  if (!field) {
    return;
  }
  (field.value as any).value = newValue;

  const targetName = (operation.field.path[0] as Name).name;
  const targetField = (operation.field.path[1] as Name).name;
  const idx = things.findIndex((t) => t.name === targetName);
  if (idx < 0) return;
  const targetThing = things[idx];
  const newCode = rewriteValueInCode({
    code: targetThing.code,
    field: targetField,
    value: newValue,
  });
  const loaded = load(newCode);
  things[idx] = {
    ...targetThing,
    ...loaded,
    code: newCode,
  };
}
