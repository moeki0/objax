export function rewriteStickyInCode({
  code,
  sticky,
}: {
  code: string;
  sticky?: string;
}) {
  const stickyLine = /^sticky .*/m;
  let newCode = code;
  if (stickyLine.test(newCode)) {
    if (sticky) {
      newCode = newCode.replace(stickyLine, `sticky ${sticky}`);
    } else {
      newCode = newCode.replace(stickyLine, "").trimEnd();
    }
  } else if (sticky) {
    newCode = `${newCode}\nsticky ${sticky}`;
  }
  return newCode;
}
