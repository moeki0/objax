export { default } from "next-auth/middleware";

// Protect all app routes, but exclude:
// - /api (all), handled per-route
// - /api/auth/* (NextAuth endpoints)
// - /login (sign-in page)
// - static assets and Next internals
export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|login|.*\\.(?:png|jpg|jpeg|svg|gif|webp|css|js|ico|txt|xml)).*)",
  ],
};
