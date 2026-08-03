import Navbar from "@/components/Navbar";
import UrlInput from "@/components/UrlInput";
import DotGrid from "@/components/DotGrid";
import BlurText from "@/components/BlurText";
import AnimatedContent from "@/components/AnimatedContent";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <DotGrid
          dotSize={3}
          gap={28}
          baseColor="#52525b"
          activeColor="#4F46E5"
          proximity={120}
        />
      </div>

      <Navbar />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <BlurText
          text="RepoGraph"
          className="text-4xl font-bold text-gray-900 justify-center dark:text-gray-100"
          delay={120}
          animateBy="letters"
        />

        <AnimatedContent distance={40} duration={0.6} delay={0.4}>
          <p className="text-center text-gray-500 dark:text-gray-400">
            Paste a GitHub repository URL to visualize its structure
          </p>
        </AnimatedContent>

        <AnimatedContent distance={40} duration={0.6} delay={0.6}>
          <UrlInput />
        </AnimatedContent>
      </main>
    </div>
  );
}
