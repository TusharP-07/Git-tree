import Link from "next/link";
import LoginButton from "./LoginButton";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <Link href="/" className="text-lg font-bold text-brand">
        RepoGraph
      </Link>
      <div className="flex items-center gap-3"><ThemeToggle /><LoginButton /></div>
    </nav>
  );
}
