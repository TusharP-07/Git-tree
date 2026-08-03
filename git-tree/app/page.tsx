import Navbar from "@/components/Navbar";
import UrlInput from "@/components/UrlInput";
import DotGrid from "@/components/DotGrid";
import BlurText from "@/components/BlurText";
import AnimatedContent from "@/components/AnimatedContent";

export default function HomePage() {
  return (
    <div className="home-page relative flex min-h-screen flex-col overflow-hidden bg-slate-50 dark:bg-[#090b14]">
      <div className="absolute inset-0 -z-10 opacity-70 dark:opacity-35">
        <DotGrid
          dotSize={3}
          gap={28}
          baseColor="#52525b"
          activeColor="#4F46E5"
          proximity={120}
        />
      </div>

      <Navbar />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
        <section className="w-full max-w-3xl rounded-3xl border border-white/70 bg-white/75 px-6 py-12 text-center shadow-2xl shadow-indigo-950/10 backdrop-blur-xl sm:px-12 dark:border-white/10 dark:bg-[#11172a]/80 dark:shadow-black/40">
          <AnimatedContent distance={32} duration={0.6}>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Repository explorer</p>
          </AnimatedContent>
          <BlurText
            text="See your codebase clearly."
            className="justify-center text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl"
            delay={60}
            animateBy="letters"
          />
          <AnimatedContent distance={32} duration={0.6} delay={0.25}>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Paste a GitHub repository URL to map its structure and understand how its files connect.
            </p>
          </AnimatedContent>
          <AnimatedContent distance={32} duration={0.6} delay={0.4}>
            <div className="mt-9"><UrlInput /></div>
          </AnimatedContent>
        </section>
      </main>
    </div>
  );
}
