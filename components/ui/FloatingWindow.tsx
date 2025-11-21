"use client";
import { useEffect, useState } from "react";

export type FloatingWindowProps = {
  open: boolean;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
};

export function FloatingWindow({
  open,
  initialX = 10,
  initialY = 10,
  initialWidth = 400,
  initialHeight = 300,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  children,
}: FloatingWindowProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [dragging, setDragging] = useState(false);
  const [clickedPos, setClickedPos] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onUp = () => {
      if (dragging) setDragging(false);
      if (resizing) setResizing(false);
    };
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({ x: e.pageX - clickedPos.x, y: e.pageY - clickedPos.y });
      } else if (resizing) {
        const dx = e.pageX - resizeStart.x;
        const dy = e.pageY - resizeStart.y;
        setSize({
          width: Math.max(200, initialSize.width + dx),
          height: Math.max(160, initialSize.height + dy),
        });
      }
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mousemove", onMove);
    };
  }, [dragging, resizing, clickedPos.x, clickedPos.y, resizeStart.x, resizeStart.y, initialSize.width, initialSize.height]);

  if (!open) return null;

  return (
    <div
      className={`bg-gray-100 text-xs z-999 absolute overflow-auto border border-gray-300 shadow-xl rounded ${className}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      <div
        className={`h-6 cursor-move sticky top-0 bg-gray-200 border-b border-gray-300 ${headerClassName}`}
        onMouseDown={(e) => {
          setDragging(true);
          setClickedPos({
            x: e.clientX - e.currentTarget.getBoundingClientRect().x,
            y: e.clientY - e.currentTarget.getBoundingClientRect().y,
          });
        }}
      />
      <div className={`p-3 ${bodyClassName}`}>{children}</div>
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
        title="Resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          setResizing(true);
          setResizeStart({ x: e.pageX, y: e.pageY });
          setInitialSize({ width: size.width, height: size.height });
        }}
      />
    </div>
  );
}

