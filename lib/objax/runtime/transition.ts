/* eslint-disable @typescript-eslint/no-explicit-any */
import { Name, Thing, TransitionType } from "../type";
import { getField } from "./get-field";
import { getValue } from "./get-value";
import { load } from "./load";
import { rewriteValueInCode } from "./rewrite-value-in-code";

export function transition({
  things,
  transition,
}: {
  things: Thing[];
  transition: TransitionType;
}) {
  const field = getField(
    things,
    (transition.field.path[0] as Name).name,
    (transition.field.path[1] as Name).name
  );
  if (!field) {
    return;
  }

  if (!transition.states.length) {
    return;
  }

  const states = transition.states.map((s) =>
    getValue(things, s, transition.field)
  );
  const current = getValue(things, field.value, transition.field);
  const idx = states.findIndex((v) => v === current);
  const next = idx === -1 ? 0 : (idx + 1) % states.length;

  if ((field.value as any).value !== undefined) {
    (field.value as any).value = states[next];

    const targetName = (transition.field.path[0] as Name).name;
    const targetField = (transition.field.path[1] as Name).name;
    const index = things.findIndex((t) => t.name === targetName);
    if (index < 0) return;
    const targetThing = things[index];
    const newCode = rewriteValueInCode({
      code: targetThing.code,
      field: targetField,
      value: states[next],
    });
    const loaded = load(newCode);
    things[index] = {
      ...targetThing,
      ...loaded,
      code: newCode,
    };
  }
}
