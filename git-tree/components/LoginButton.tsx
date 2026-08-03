"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-600 dark:text-slate-300 sm:block">{session.user?.name}</span>
        <button
          onClick={() => signOut()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/25"
    >
      Login with GitHub
    </button>
  );
}
