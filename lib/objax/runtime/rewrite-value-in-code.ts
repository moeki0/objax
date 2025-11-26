export const format = (v: unknown): string => {
  if (typeof v === "string") {
    if (v.match(/\d+/)) {
      return `${v}`;
    }
    const escaped = v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return `${v}`;
  }
  if (typeof v === "boolean") {
    return v ? "true" : "false";
  }
  if (Array.isArray(v)) {
    return `[${v.map((x) => format(x)).join(", ")}]`;
  }
  if (v === null) return "null";
  return `"${String(v ?? "")}"`;
};

export function rewriteValueInCode({
  code,
  field,
  value,
}: {
  code: string;
  field: string;
  value: unknown;
}) {
  const replacement = `${field} is ${format(value)}`;
  const textPattern = new RegExp(`^${field}\\s*is\\s*".+"$`, "m");
  if (textPattern.test(code)) {
    return code.replace(textPattern, replacement);
  }
  const fieldPattern = new RegExp(`^${field}\\s*is\\s*.+\\..+$`, "m");
  if (fieldPattern.test(code)) {
    return code;
  }
  const pattern = new RegExp(`^${field}\\s*is\\s*.*$`, "m");

  if (pattern.test(code)) {
    console.log(replacement)
    return code.replace(pattern, replacement);
  }
  return `${code}\n${replacement}`;
}
