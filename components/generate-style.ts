import { getField, getValue, Thing } from "@/lib/objax";
import { CSSProperties } from "react";

export const generateStyle = ({
  things,
  thing,
}: {
  things: Thing[];
  thing: Thing;
}): CSSProperties => {
  const field = getField(things, thing.name, "style");
  if (!field) {
    return {};
  }
  const value = getValue(things, field.value);
  const bgColorField = getField(things, thing.name, "bgColor");
  const bgColor = bgColorField ? getValue(things, bgColorField.value) : "white";
  const borderColorField = getField(things, thing.name, "borderColor");
  const borderColor = borderColorField
    ? getValue(things, borderColorField.value)
    : "#ccc";
  const textColorField = getField(things, thing.name, "textColor");
  const textColor = textColorField
    ? getValue(things, textColorField.value)
    : "#333";
  if (value === "card") {
    return {
      boxShadow: "1px 1px rgba(0,0,0,0.2)",
      border: `double 10px ${borderColor}`,
      background: String(bgColor),
      color: String(textColor),
    };
  } else if (value === "button") {
    return {
      boxShadow: "1px 1px rgba(0,0,0,0.2)",
      border: "1px solid #ccc",
      borderRadius: "32px",
      background: "#efefef",
    };
  } else if (value === "window") {
    return {
      boxShadow: "1px 1px 10px rgba(0,0,0,0.2)",
      border: "1px solid #ccc",
      borderRadius: "10px",
      background: "white",
    };
  } else {
    return {};
  }
};
