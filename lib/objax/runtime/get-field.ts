import { FieldType, Thing } from "../type";

export function getField(
  things: Thing[],
  thing: string,
  field: string
): FieldType | undefined {
  return things
    .find((t) => t.name === thing)
    ?.fields?.find((f) => f.name.name === field);
}
