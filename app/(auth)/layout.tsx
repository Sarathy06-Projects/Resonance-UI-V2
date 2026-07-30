import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col">
      <header className="p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={32} />
          <span className="text-xl font-bold tracking-tight hidden sm:block dark:text-white">Resonance</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
