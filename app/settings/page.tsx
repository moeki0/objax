"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const contactEmail = "hi@moeki.org";
  const [message, setMessage] = useState("");

  const handleDeleteAccount = async () => {
    try {
      setMessage("Deleting account data...");
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error("Failed to delete account data");
      setMessage("Account data deleted. Signing out...");
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      console.error(err);
      setMessage(
        "Failed to delete account. Please try again or contact support."
      );
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 space-y-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
      </header>

      <section className="space-y-3 bg-white py-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm text-gray-600">
          Email us with questions or feedback.
        </p>
        <a
          href={`mailto:${contactEmail}`}
          className="inline-flex items-center hover:bg-gray-50 justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          <span className="mr-1">Mail to </span>
          <span className="underline">{contactEmail}</span>
        </a>
      </section>

      <section className="space-y-3 bg-white py-2">
        <h2 className="text-lg font-semibold">Logout</h2>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Logout
        </button>
      </section>

      <section className="space-y-3  py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-red-700">Delete account</h2>
        </div>
        <p className="text-sm text-gray-700">This action cannot be undone.</p>
        <button
          onClick={handleDeleteAccount}
          className="inline-flex items-center justify-center rounded-md border border-red-400 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Delete account
        </button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </section>
    </main>
  );
}
