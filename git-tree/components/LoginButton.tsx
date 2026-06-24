"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{session.user?.name}</span>
        <button
          onClick={() => signOut()}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand/90"
    >
      Login with GitHub
    </button>
  );
}