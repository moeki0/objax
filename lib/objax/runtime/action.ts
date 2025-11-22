import { EventActionType, Name, Thing } from "../type";
import { getOperation } from "./get-operation";
import { operate } from "./operate";

export function action({
  things,
  ea,
}: {
  things: Thing[];
  ea: EventActionType;
}) {
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
