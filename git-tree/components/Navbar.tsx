import Link from "next/link";
import LoginButton from "./LoginButton";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <Link href="/" className="text-lg font-bold text-brand">
        RepoGraph
      </Link>
      <LoginButton />
    </nav>
  );
}