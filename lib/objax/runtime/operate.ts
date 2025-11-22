/* eslint-disable @typescript-eslint/no-explicit-any */
import { Name, OperationType, Thing } from "../type";
import { getField } from "./get-field";
import { getValue } from "./get-value";

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
}
