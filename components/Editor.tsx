/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { load } from "@/lib/objax/runtime/load";
import { useEffect, useRef, useState } from "react";
import { Runtime } from "@/lib/objax/runtime";
import { Rnd } from "react-rnd";
import Editor, { Monaco, OnChange, OnMount } from "@monaco-editor/react";
import { Thing } from "@/lib/objax/type";
import { IoCloseSharp } from "react-icons/io5";

export function EditorComponent({
  thing,
  runtime,
  editor,
  setEditor,
}: {
  thing: Thing;
  runtime: Runtime;
  editor: boolean;
  setEditor: (editor: boolean) => void;
}) {
  const edit = thing.code;
  const handleChange: OnChange = (value) => {
    const newCode = value || "";
    try {
      const result = load(newCode);
      runtime.update({ id: thing.id, input: { ...result, code: newCode } });
      monacoRef.current?.editor.setModelMarkers(
        editorRef.current.getModel(),
        "owner",
        []
      );
    } catch (e: any) {
      console.log(monacoRef.current);
      monacoRef.current?.editor.setModelMarkers(
        editorRef.current.getModel(),
        "owner",
        [
          {
            startLineNumber: e.location.start.line,
            startColumn: e.location.start.column,
            endLineNumber: e.location.end.line,
            endColumn: e.location.end.column,
            message: e.message,
            severity: monacoRef.current.MarkerSeverity.Error,
          },
        ]
      );
    }
  };
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const scroller = document.querySelector(".scroller");
    if (!scroller) {
      return;
    }
    const handleScroll = () => {
      setPos({
        x: scroller.scrollTop + window.innerHeight / 2 - 200,
        y: scroller.scrollLeft + window.innerWidth / 2 - 180,
      });
    };
    scroller.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!editor) {
    return <></>;
  }

  return (
    <Rnd
      default={{
        x: pos.x,
        y: pos.y,
        width: 360,
        height: 400,
      }}
      draggablehandle=".header"
      className="border border-gray-300 shadow-xl rounded overflow-hidden z-9999 bg-white"
    >
      <div className="header h-7 w-full bg-gray-50 text-gray-500 px-1 rounded border-b border-gray-300 flex items-center">
        <button
          onClick={() => setEditor(false)}
          className="border border-gray-300 bg-white p-px"
        >
          <IoCloseSharp />
        </button>
      </div>
      <Editor
        theme="vs"
        value={edit}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          wordWrap: "on",
        }}
      />
    </Rnd>
  );
}
