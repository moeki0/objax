/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ArrayType,
  FieldValueType,
  IntegerType,
  Name,
  Thing,
  ValueType,
} from "../type";
import { getField } from "./get-field";

export function getValue(
  things: Thing[],
  t: ValueType,
  it?: FieldValueType
): unknown {
  if (t === undefined) {
    return;
  }
  if (!t.type) {
    return t;
  }
  if (t.type === "Integer") {
    return t.value;
  } else if (t.type === "Number") {
    return t.value;
  } else if (t.type === "String") {
    return t.value;
  } else if (t.type === "Compare") {
    const l = getValue(things, t.left, it);
    const r = getValue(things, t.right, it);
    switch (t.op) {
      case "==":
        return l === r;
      case "!=":
        return l !== r;
      case "<":
        return Number(l) < Number(r);
      case "<=":
        return Number(l) <= Number(r);
      case ">":
        return Number(l) > Number(r);
      case ">=":
        return Number(l) >= Number(r);
      default:
        return false;
    }
  } else if (t.type === "It") {
    if (!it) {
      return undefined;
    }
    return getValue(
      things,
      getField(things, (it.path[0] as any).name, (it!.path[1] as any).name)!
        .value,
      it
    );
  } else if (t.type === "Or") {
    const l = getValue(things, t.left, it);
    const r = getValue(things, t.right, it);
    return Boolean(l) || Boolean(r);
  } else if (t.type === "And") {
    const l = getValue(things, t.left, it);
    const r = getValue(things, t.right, it);
    return Boolean(l) && Boolean(r);
  } else if (t.type === "Not") {
    const v = getValue(things, t.operand, it);
    return !Boolean(v);
  } else if (t.type === "BinaryOp") {
    const leftVal = getValue(things, t.left, it);
    const rightVal = getValue(things, t.right, it);
    if (t.op === "_") {
      const lIsArr = Array.isArray(leftVal);
      const rIsArr = Array.isArray(rightVal);
      if (lIsArr && rIsArr) {
        return [...leftVal, ...rightVal];
      } else if (lIsArr) {
        return [...leftVal, rightVal];
      } else if (rIsArr) {
        return [leftVal, ...rightVal];
      }
      return String(leftVal ?? "") + String(rightVal ?? "");
    }
    const left = Number(leftVal);
    const right = Number(rightVal);
    if (t.op === "+") {
      return left + right;
    } else if (t.op === "-") {
      return left - right;
    } else if (t.op === "*") {
      return left * right;
    } else if (t.op === "/") {
      return left / right;
    } else if (t.op === "%") {
      return left % right;
    } else if (t.op === "^" || t.op === "**") {
      return Math.pow(left, right);
    }
  } else if (t.type === "FunctionCall") {
    const fn = t.name.name.toLowerCase();
    const args = t.args.map((arg) => getValue(things, arg, it)) as number[];
    const math = Math as Record<string, (a: number, b?: number) => number>;
    switch (fn) {
      case "sin":
      case "cos":
      case "tan":
      case "sqrt":
      case "exp":
      case "log":
      case "abs":
      case "floor":
      case "ceil":
        return math[fn]?.(Number(args[0]));
      case "min":
      case "max":
        return math[fn]?.(...(args as number[]));
      default:
        return undefined;
    }
  } else if (t.type === "Constant") {
    if (t.value === "pi") return Math.PI;
    if (t.value === "e") return Math.E;
  } else if (t.type === "Reference") {
    // Built-in Time namespace support
    const ns = (t.path[0] as Name | undefined)?.name;
    const key = (t.path[1] as Name | undefined)?.name;
    if (ns === "Time" && key) {
      const now = new Date();
      switch (key) {
        case "year":
          return now.getFullYear();
        case "month":
          // 1-12 for human-friendly month
          return now.getMonth() + 1;
        case "day":
          // 0-6 (Sunday-Saturday) to align with JS Date
          return now.getDay();
        case "date":
          // Day of month 1-31
          return now.getDate();
        case "hours":
          return now.getHours();
        case "minutes":
          return now.getMinutes();
        case "seconds":
          return now.getSeconds();
        case "miniseconds":
          // Milliseconds; name kept as requested
          return now.getMilliseconds();
        case "epochSeconds":
        case "unix":
          return Math.floor(now.getTime() / 1000);
        case "epochMilliseconds":
        case "epochMiliseconds":
        case "unixMs":
          return now.getTime();
        default:
          break;
      }
    }
    // Resolve base field value (first segment must be Name, second normally Name)
    const head = t.path[0] as Name | undefined;
    const second = t.path[1] as Name | IntegerType | undefined;
    if (!head || !second || (second as any).type !== "Name") {
      return undefined;
    }
    const field = getField(things, head.name, (second as Name).name);
    if (!field) {
      return "";
    }
    // Evaluate field's value
    let cur: any = getValue(things, field.value, it);
    // Apply any further path segments (array indexing, 1-based)
    if (t.path.length > 2) {
      for (let i = 2; i < t.path.length; i++) {
        const seg: any = t.path[i];
        const idxVal =
          seg?.type === "Integer"
            ? seg.value
            : !Number.isNaN(seg?.name)
            ? Number(seg.name)
            : null;
        if (idxVal !== null && idxVal !== undefined) {
          const idx = Number(idxVal);
          if (Array.isArray(cur)) {
            cur = cur[idx - 1] || "";
          } else {
            return "";
          }
        } else {
          // Unsupported segment type after field; stop
          return "";
        }
      }
    }
    return cur;
  } else {
    if ((t as any).type === "Array") {
      const arr = (t as ArrayType).value?.map((v) => getValue(things, v, it));
      return arr;
    }
    return (t as any).value;
  }
}
