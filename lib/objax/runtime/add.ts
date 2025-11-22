import { generateCoolId } from "@/lib/utils/generate-cool-id";
import { Thing } from "../type";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { load } from "./load";

export function add({
  things,
  input,
}: {
  things: Thing[];
  input?: Partial<Thing>;
}) {
  const name = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    style: "capital",
    separator: "",
    length: 2,
  });

  const x = input?.x ?? 400;
  const y = input?.y ?? 400;

  const code = `name is ${name}
width is 100
height is 100
x is ${Math.round(x)}
y is ${Math.round(y)}
styleBorder is "1px solid #ddd"
styleBorderRadius is "10px"
`;

  things.push({
    id: generateCoolId(),
    code,
    users: [],
    ...load(code),
    ...input,
  });
}
