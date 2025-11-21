"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="border border-gray-300 rounded p-6 shadow-sm w-[360px] text-center">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>
        <button
          className="border bg-white px-4 py-2 rounded border-gray-300 w-full"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
