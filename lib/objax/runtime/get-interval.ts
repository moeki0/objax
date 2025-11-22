import { EventActionType } from "../type";

export function getInterval(ea: EventActionType) {
  const match = ea.name.name.toLowerCase().match(/intervalwith(\d+)ms/);
  if (!match) {
    return 0;
  }
  return Number(match[1]);
}
