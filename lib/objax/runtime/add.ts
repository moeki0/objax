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

  const code = `name is ${name}
width is 100
height is 100
x is 400
y is 400
styleBorder is "1px solid #ddd"
styleBorderRadius is "10px"
`;

  things.push({
    id: generateCoolId(),
    code,
    ...load(code),
    ...input,
  });
}
