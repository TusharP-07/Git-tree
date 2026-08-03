import Link from "next/link";
import LoginButton from "./LoginButton";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="relative z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/60 px-4 py-4 backdrop-blur-xl sm:px-6 dark:border-white/10 dark:bg-[#0c1120]/70">
      <Link href="/" className="text-lg font-bold tracking-tight text-indigo-600 dark:text-indigo-300">
        RepoGraph
      </Link>
      <div className="flex items-center gap-3"><ThemeToggle /><LoginButton /></div>
    </nav>
  );
}
