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
  if (newCode.match(/x is -?\d+/)) {
    newCode = newCode.replace(/x is -?\d+/, `x is ${x}`);
  } else {
    newCode = newCode + "\n" + `x is ${x}`;
  }
  if (newCode.match(/y is -?\d+/)) {
    newCode = newCode.replace(/y is -?\d+/, `y is ${y}`);
  } else {
    newCode = newCode + "\n" + `y is ${y}`;
  }
  return newCode;
}
