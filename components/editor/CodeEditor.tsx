"use client";
import TextareaAutosize from "react-textarea-autosize";

export function CodeEditor({
  value,
  onChange,
  onBlur,
  parseError,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  parseError?: string | null;
}) {
  return (
    <>
      <TextareaAutosize
        className="border bg-white w-full border-gray-300 rounded font-mono p-2"
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur && onBlur()}
        value={value}
        minRows={10}
        maxRows={10}
      />
      {parseError && (
        <div className="border border-red-400 bg-red-50 rounded p-2 mt-1 mb-2">
          {parseError}
        </div>
      )}
    </>
  );
}

