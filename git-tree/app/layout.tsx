import type { Metadata } from "next";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "RepoGraph — Visualize Any GitHub Repository",
  description: "Generate interactive file and dependency graphs for any GitHub repo, with AI-powered file summaries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-gray-50 text-gray-900">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}