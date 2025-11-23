import { useEffect, useState } from "react";
import { Help } from "./Help";
import { WORLD_OFFSET } from "./World";
import { createPortal } from "react-dom";

export function Footer({
  worldOffset,
}: {
  worldOffset: { x: number; y: number };
}) {
  const [posY, setPosY] = useState(0);
  const [posX, setPosX] = useState(0);

  useEffect(() => {
    const scroller = document.querySelector(".scroller");
    if (!scroller) {
      return;
    }
    const handleScroll = () => {
      setPosY(
        scroller.scrollTop +
          window.innerHeight / 2 +
          worldOffset.y -
          WORLD_OFFSET
      );
      setPosX(
        scroller.scrollLeft +
          window.innerWidth / 2 +
          worldOffset.x -
          WORLD_OFFSET
      );
    };
    scroller.addEventListener("scroll", handleScroll);
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [worldOffset]);

  const [help, setHelp] = useState(false);

  return (
    <>
      <footer className="fixed bottom-0 z-10000 left-1/2 -translate-x-1/2 p-3">
        <div className="flex items-center gap-3 font-mono w-screen justify-center flex-wrap text-xs">
          <div className="text-nowrap">Ctrl + N to add</div>
          <div className="text-nowrap">/</div>
          <div className="text-nowrap">⌘ + Click to edit</div>
          <div className="text-nowrap">/</div>
          <div>
            {posY},{posX}
          </div>
          <div>/</div>
          <button
            onClick={() => setHelp(!help)}
            className="hover:bg-gray-50 bg-white text-nowrap border border-gray-300 px-3 py-1 rounded-full"
          >
            ? Help
          </button>
        </div>
      </footer>
      {document.querySelector(".world") &&
        createPortal(
          <Help help={help} setHelp={setHelp} />,
          document.querySelector(".world")!
        )}
    </>
  );
}
