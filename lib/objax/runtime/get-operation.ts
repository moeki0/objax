import { OperationType, Thing } from "../type";

export function getOperation(
  things: Thing[],
  thing: string,
  op: string
): OperationType | undefined {
  return things
    ?.find((t) => t.name === thing)
    ?.operations?.find((o) => o.name.name === op);
}
