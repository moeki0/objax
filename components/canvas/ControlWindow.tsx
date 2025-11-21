import {
  Dispatch,
  MouseEventHandler,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Thing } from "@/lib/objax";
import { ThingList } from "../ThingList";

type ControlWindowProps = {
  isOpen: boolean;
  onToggleEdit: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onReset: () => void;
  onChangeCode: (values: (string | undefined)[], ids: (string | undefined)[]) => void;
  onFlushCodeSave: (id: string, thing: Thing) => void;
  setIsSyntaxOpen: (open: boolean) => void;
  things: Thing[];
  selected: Thing | null;
  setSelected: Dispatch<SetStateAction<Thing | null>>;
  currentCodeRef: MutableRefObject<string>;
  parseError: string | null;
  onSelectThing?: (thing: Thing) => void;
};

export function ControlWindow({
  isOpen,
  onToggleEdit,
  onAdd,
  onDelete,
  onReset,
  onChangeCode,
  onFlushCodeSave,
  setIsSyntaxOpen,
  things,
  selected,
  setSelected,
  currentCodeRef,
  parseError,
  onSelectThing,
}: ControlWindowProps) {
  const [windowPos, setWindowPos] = useState({ x: 10, y: 10 });
  const [windowSize, setWindowSize] = useState({ width: 400, height: 300 });
  const [isResizing, setIsResizing] = useState(false);
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [clickedPos, setClickedPos] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });

  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
    setIsDragging(true);
    setClickedPos({
      x: e.clientX - e.currentTarget.getBoundingClientRect().x,
      y: e.clientY - e.currentTarget.getBoundingClientRect().y,
    });
  };

  const handleResizeMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.pageX, y: e.pageY });
    setInitialSize({ width: windowSize.width, height: windowSize.height });
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
      if (isResizing) setIsResizing(false);
    };
    const handleDrag = (e: MouseEvent) => {
      if (isDragging) {
        const x = e.pageX - clickedPos.x;
        const y = e.pageY - clickedPos.y;
        setWindowPos({ x, y });
      } else if (isResizing) {
        const dx = e.pageX - resizeStart.x;
        const dy = e.pageY - resizeStart.y;
        const width = Math.max(32, initialSize.width + dx);
        const height = Math.max(32, initialSize.height + dy);
        setWindowSize({ width, height });
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleDrag);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleDrag);
    };
  }, [
    clickedPos.x,
    clickedPos.y,
    initialSize.height,
    initialSize.width,
    isDragging,
    isResizing,
    resizeStart.x,
    resizeStart.y,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className=" bg-gray-100 text-xs z-999 absolute overflow-auto right-0 bottom-0 w-120 border border-gray-300 shadow-xl rounded h-[400px]"
      style={{
        left: `${windowPos.x}px`,
        top: `${windowPos.y}px`,
        width: `${windowSize.width}px`,
        height: `${windowSize.height}px`,
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        className="h-6 cursor-move sticky top-0 bg-gray-200 border-b border-gray-300"
      ></div>
      <div className="p-4">
        <div className="gap-2 mb-2 flex-wrap flex items-center">
          <button
            className="border bg-white px-4 py-1 rounded border-gray-300"
            onClick={onAdd}
          >
            Add
          </button>
          <button
            className="border bg-white px-4 py-1 rounded border-gray-300"
            onClick={onToggleEdit}
          >
            Edit
          </button>
          <button
            className="border bg-white px-4 py-1 rounded border-gray-300"
            onClick={() => {
              try {
                window.location.href = "/api/export";
              } catch {}
            }}
          >
            Backup
          </button>
          <button
            onClick={() => setIsSyntaxOpen(true)}
            className="border bg-white px-4 py-1 rounded border-gray-300"
            title="View syntax"
            type="button"
          >
            Help
          </button>
        </div>
        {selected && (
          <>
            <TextareaAutosize
              className="border bg-white w-full border-gray-300 rounded font-mono p-2"
              onChange={(e) => {
                currentCodeRef.current = e.target.value;
                onChangeCode([e.target.value], [selected.id]);
              }}
              onBlur={() => selected?.id && onFlushCodeSave(selected.id, selected)}
              value={currentCodeRef.current}
              minRows={10}
              maxRows={10}
            />
            {parseError && (
              <pre className="border border-red-400 bg-red-50 rounded p-2 mt-1 mb-2 break-all text-wrap">
                {parseError}
              </pre>
            )}
            <div className="gap-2 mb-2 flex items-center">
              <button
                className="border bg-white px-4 py-1 rounded border-gray-300"
                onClick={onDelete}
              >
                Delete
              </button>
              <button
                className="border bg-white px-4 py-1 rounded border-gray-300"
                onClick={onReset}
              >
                Reset
              </button>
            </div>
          </>
        )}
        <ThingList
          setSelected={(t) => {
            setSelected(t);
            currentCodeRef.current = t.code || "";
            onSelectThing?.(t);
          }}
          selected={selected}
          things={things}
        />
      </div>
      <div
        className={`absolute bottom-0 right-0 w-3 h-3 cursor-se-resize`}
        onMouseDown={handleResizeMouseDown}
        title="Resize"
      ></div>
    </div>
  );
}
