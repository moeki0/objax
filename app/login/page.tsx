"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { IoLogoGoogle } from "react-icons/io5";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-6 text-center space-x-6 max-w-[600px]">
        <div className="space-y-2 mb-10 text-gray-700">
        <p>We are truly in the age of AI.</p>
        <p>My work style has changed significantly in the past year as well.</p>
        <p>
          The workflow of having AI code has been incorporated into my daily
          tasks.
        </p>
        <p>
          Objax is a service dedicated to preserving for posterity the classic
          enjoyment of iterating on UI objects through hands-on manipulation.
        </p>
        <p>
          Everyone is thrown into a finite space where they can freely create
          UIs and games.
        </p>
        <p>Please enjoy the {'"past"'} joy of coding.</p>
        </div>
        <h1 className="font-semibold text-9xl">Objax</h1>
        <button
          className="border bg-white hover:bg-gray-50 cursor-pointer px-4 py-2 rounded border-gray-300 justify-self-center flex gap-3 items-center justify-center"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          <IoLogoGoogle />
          Continue with Google
        </button>
        <div className="mt-6 text-sm text-gray-600 space-x-3">
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
