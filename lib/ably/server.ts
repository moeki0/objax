import Ably from "ably";

let rest: Ably.Rest | null = null;

export function getAblyRest(): Ably.Rest {
  if (!rest) {
    const key = process.env.ABLY_API_KEY as string;
    if (!key) {
      throw new Error("ABLY_API_KEY is not set");
    }
    rest = new Ably.Rest(key);
  }
  return rest;
}
