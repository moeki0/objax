export function rewriteSizeInCode({
  code,
  width,
  height,
}: {
  code: string;
  width: number;
  height: number;
}) {
  let newCode = code;
  if (newCode.match(/width is \d+/)) {
    newCode = newCode.replace(/width is \d+/, `width is ${width}`);
  } else {
    newCode = newCode + "\n" + `width is ${width}`;
  }
  if (newCode.match(/height is \d+/)) {
    newCode = newCode.replace(/height is \d+/, `height is ${height}`);
  } else {
    newCode = newCode + "\n" + `height is ${height}`;
  }
  return newCode;
}
