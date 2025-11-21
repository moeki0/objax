"use client";
import { Thing } from "@/lib/objax";
import { FloatingWindow } from "../ui/FloatingWindow";
import { ThingList } from "../ThingList";

export function ThingListWindow({
  open,
  things,
  selected,
  setSelected,
  centerOnThing,
}: {
  open: boolean;
  things: Thing[];
  selected: Thing | null;
  setSelected: (t: Thing) => void;
  centerOnThing: (t: Thing) => void;
}) {
  return (
    <FloatingWindow
      open={open}
      initialX={10}
      initialY={10}
      initialWidth={280}
      initialHeight={360}
    >
      <ThingList
        things={things}
        selected={selected}
        setSelected={(t) => {
          setSelected(t);
          centerOnThing(t);
        }}
      />
    </FloatingWindow>
  );
}
