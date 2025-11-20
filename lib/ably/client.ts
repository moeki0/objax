import Ably from "ably";

// Ably Realtime singleton for the browser
let instance: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!instance) {
    instance = new Ably.Realtime({
      // Use token auth from our Next route
      authUrl: "/api/ably/auth",
      echoMessages: true, // allow receiving server-published messages
    });
  }
  return instance;
}

