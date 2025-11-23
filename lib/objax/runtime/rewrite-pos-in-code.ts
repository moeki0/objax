import { rewriteValueInCode } from "./rewrite-value-in-code";

export function rewritePosInCode({
  code,
  x,
  y,
}: {
  code: string;
  x: number;
  y: number;
}) {
  let newCode = code;
  newCode = rewriteValueInCode({ code: newCode, field: "x", value: x });
  newCode = rewriteValueInCode({ code: newCode, field: "y", value: y });
  return newCode;
}
