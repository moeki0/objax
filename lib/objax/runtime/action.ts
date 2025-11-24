import { EventActionType, Name, Thing } from "../type";
import { getValue } from "./get-value";
import { getOperation } from "./get-operation";
import { getTransition } from "./get-transition";
import { operate } from "./operate";
import { transition } from "./transition";

export function action({
  things,
  ea,
}: {
  things: Thing[];
  ea: EventActionType;
}) {
  if (ea.guard !== undefined && ea.guard !== null) {
    const ok = Boolean(getValue(things, ea.guard));
    if (!ok) return;
  }
  const t = getTransition(
    things,
    (ea.transition.path[0] as Name).name,
    (ea.transition.path[1] as Name).name
  );
  if (t) {
    transition({ things: things, transition: t });
  }
  const operation = getOperation(
    things,
    (ea.transition.path[0] as Name).name,
    (ea.transition.path[1] as Name).name
  );
  if (!operation) {
    return;
  }
  operate({ things, operation });
}
