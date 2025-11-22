/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dispatch, MutableRefObject, SetStateAction } from "react";

import { Thing } from "@/lib/objax";
import { ThingComponent } from "../Thing";

type ScrollPos = { left: number; top: number };

type Props = {
  things: Thing[];
  selected: Thing | null;
  editing: boolean;
  scrollPos: ScrollPos;
  setScrollPos: (pos: ScrollPos) => void;
  setSelected: (thing: Thing) => void;
  setThings: Dispatch<SetStateAction<Thing[]>>;
  publishUpdate: (payload: {
    upserts?: Thing[];
    deletes?: string[];
  }) => Promise<void>;
  schedulePersist: (args?: {
    things?: Thing[];
    deletes?: Thing[];
  }) => Promise<void>;
  debounce: (func: () => Promise<any>, wait: number) => Promise<void>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  bgRef: React.RefObject<HTMLDivElement | null>;
  onToggleWindow: () => void;
};

export function CanvasViewport({
  things,
  selected,
  editing,
  scrollPos,
  setScrollPos,
  setSelected,
  setThings,
  publishUpdate,
  schedulePersist,
  debounce,
  scrollRef,
  bgRef,
  onToggleWindow,
}: Props) {
  return (
    <div className="w-screen h-screen relative">
      <div
        ref={scrollRef}
        className="w-screen h-screen bg-white overflow-scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (
            scrollPos.left !== el.scrollLeft ||
            scrollPos.top !== el.scrollTop
          ) {
            setScrollPos({ left: el.scrollLeft, top: el.scrollTop });
          }
        }}
        onClick={(e) => {
          if (e.metaKey) {
            onToggleWindow();
          }
        }}
      >
        <div
          className="relative overflow-visible"
          ref={bgRef}
          style={{ width: 100000, height: 100000 }}
        >
          {things.map((thing) => (
            <ThingComponent
              things={things}
              key={thing.id}
              selected={selected}
              setThings={setThings}
              thing={thing}
              setSelected={() => {
                setSelected(thing);
              }}
              editing={editing}
              scrollLeft={scrollPos.left}
              scrollTop={scrollPos.top}
              onActionUpdate={(ids, updatedList) => {
                if (ids.length) publishUpdate({ upserts: updatedList });
                if (ids.length) schedulePersist({ things: updatedList });
              }}
              onGeometryChange={(id, updatedThing) => {
                publishUpdate({ upserts: [updatedThing] });
                debounce(
                  async () => await schedulePersist({ things: [updatedThing] }),
                  2
                );
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
