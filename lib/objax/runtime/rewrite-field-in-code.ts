export function rewriteFieldInCode({
  code,
  field,
  value,
}: {
  code: string;
  field: string;
  value: string;
}) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const replacement = `${field} is "${escaped}"`;
  const pattern = new RegExp(`^${field}\\s*is\\s*.*$`, "m");

  if (pattern.test(code)) {
    return code.replace(pattern, replacement);
  }
  return `${code}\n${replacement}`;
}
