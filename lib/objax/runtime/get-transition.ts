/* eslint-disable @typescript-eslint/no-explicit-any */
import { parse } from "../parser";
import { FieldType, Thing, TransitionType } from "../type";

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

