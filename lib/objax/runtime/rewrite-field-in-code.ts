import { format } from "./rewrite-value-in-code";

export function rewriteFieldInCode({
  code,
  field,
  value,
}: {
  code: string;
  field: string;
  value: string;
}) {
  const escaped = format(value);
  const replacement = `${field} is ${escaped}`;
  const pattern = new RegExp(`^${field}\\s*is\\s*.*$`, "m");

  if (pattern.test(code)) {
    return code.replace(pattern, replacement);
  }
  return `${code}\n${replacement}`;
}
