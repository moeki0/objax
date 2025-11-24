export function rewriteParentInCode({
  code,
  parent,
}: {
  code: string;
  parent?: string;
}) {
  const parentLine = /^parent is .*/m;
  let newCode = code;
  if (parentLine.test(newCode)) {
    if (parent) {
      newCode = newCode.replace(parentLine, `parent is ${parent}`);
    } else {
      newCode = newCode.replace(parentLine, "").trimEnd();
    }
  } else if (parent) {
    newCode = `${newCode}\nparent is ${parent}`;
  }
  return newCode;
}
