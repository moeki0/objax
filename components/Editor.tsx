/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { load } from "@/lib/objax/runtime/load";
import { useEffect, useMemo, useRef, useState } from "react";
import { Runtime } from "@/lib/objax/runtime";
import { Rnd } from "react-rnd";
import Editor, { Monaco, OnChange, OnMount } from "@monaco-editor/react";
import { Thing } from "@/lib/objax/type";
import { IoCloseSharp } from "react-icons/io5";
import { DebouncedState } from "use-debounce";

export function EditorComponent({
  thing,
  runtime,
  editor,
  setEditor,
  worldOffset,
  generate,
  highlighted,
}: {
  thing: Thing;
  runtime: Runtime;
  editor: boolean;
  setEditor: (editor: boolean) => void;
  worldOffset: { x: number; y: number };
  generate: DebouncedState<(prompt: string) => Promise<void>>;
  highlighted: boolean;
}) {
  const [freeze, setFreeze] = useState(false);
  const [currentCode, setCurrentCode] = useState(thing.code);
  const edit = freeze ? currentCode : thing.code;
  const handleChange: OnChange = (value) => {
    if (!freeze) {
      setCurrentCode(value!);
    }
    const newCode = value || "";
    try {
      const result = load(newCode);
      const prompt = newCode.match(/dream is "(.+)"/)?.[1];
      const prevPrompt = thing.code.match(/dream is "(.+)"/)?.[1];
      console.log(prompt, prevPrompt);
      if (prompt && prevPrompt !== prompt) {
        generate(prompt);
      }
      runtime.update({ id: thing.id, input: { ...result, code: newCode } });
      monacoRef.current?.editor.setModelMarkers(
        editorRef.current.getModel(),
        "owner",
        []
      );
    } catch (e: any) {
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
        x: scroller.scrollLeft + window.innerWidth / 2 - 200,
        y: scroller.scrollTop + window.innerHeight / 2 - 180,
      });
    };
    scroller.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [thing, worldOffset.x, worldOffset.y]);

  if (!editor && !highlighted) {
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
      <div className="header h-7 w-full bg-gray-50 text-gray-500 px-1 justify-between rounded border-b border-gray-300 flex items-center">
        <button
          onClick={() => setEditor(false)}
          className="border border-gray-300 bg-white p-px"
        >
          <IoCloseSharp />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFreeze(!freeze);
              setCurrentCode(thing.code);
            }}
            className="border border-gray-300 bg-white text-xs rounded px-1"
          >
            Freeze code
          </button>
          <button
            onClick={() => {
              const ok = window.confirm("Delete this thing?");
              if (!ok) return;
              runtime.remove({ id: thing.id });
              setEditor(false);
            }}
            className="border border-red-300 text-red-600 bg-white text-xs rounded px-1"
          >
            Delete
          </button>
        </div>
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
