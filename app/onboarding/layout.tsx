import { Logo } from "@/components/shared/Logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col">
      <header className="p-6 flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <span className="text-xl font-bold tracking-tight dark:text-white">Resonance</span>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center p-6 sm:p-10 max-w-3xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
