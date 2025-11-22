/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { load } from "@/lib/objax/runtime/load";
import { useMemo, useRef } from "react";
import { Runtime } from "@/lib/objax/runtime";
import { Rnd } from "react-rnd";
import Editor, { Monaco, OnChange, OnMount } from "@monaco-editor/react";
import { Thing } from "@/lib/objax/type";

export function EditorComponent({
  thing,
  runtime,
}: {
  thing: Thing;
  runtime: Runtime;
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

  return (
    <Rnd
      default={{
        x: 0,
        y: 0,
        width: 360,
        height: 400,
      }}
      draggablehandle=".header"
      className="border border-gray-300 shadow-xl rounded overflow-hidden z-9999 bg-white"
    >
      <div className="header h-7 w-full bg-gray-50 border-b border-gray-300"></div>
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
