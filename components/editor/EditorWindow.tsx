/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { FloatingWindow } from "../ui/FloatingWindow";
import { Thing } from "@/lib/objax";
import { PropertyEditor } from "./PropertyEditor";
import { CodeEditor } from "./CodeEditor";

export function EditorWindow({
  open,
  selected,
  things,
  onAdd,
  onToggleEdit,
  editing,
  onBackup,
  onDelete,
  onReset,
  code,
  onCodeChange,
  onCodeBlur,
  parseError,
}: {
  open: boolean;
  selected: Thing | null;
  things: Thing[];
  onAdd: () => void;
  onToggleEdit: () => void;
  editing: boolean;
  onBackup: () => void;
  onDelete: () => void;
  onReset: () => void;
  code: string;
  onCodeChange: (s: string) => void;
  onCodeBlur: () => void;
  parseError: string | null;
  updateThing: (mutator: (t: Thing) => Thing) => void;
  upsertFieldOnThing: (t: Thing, field: string, value: any) => Thing;
}) {
  return (
    <FloatingWindow
      open={open}
      initialX={10}
      initialY={10}
      initialWidth={420}
      initialHeight={340}
    >
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
          {editing ? "Stop Edit" : "Edit"}
        </button>
        <button
          className="border bg-white px-4 py-1 rounded border-gray-300"
          onClick={onBackup}
        >
          Backup
        </button>
      </div>
      {selected && (
        <>
          <CodeEditor
            value={code}
            onChange={onCodeChange}
            onBlur={onCodeBlur}
            parseError={parseError}
          />
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
    </FloatingWindow>
  );
}
