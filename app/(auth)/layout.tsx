import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 flex flex-col">
      <header className="p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-950 dark:bg-white rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 bg-white dark:bg-zinc-950 rounded-sm transform rotate-45" />
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:block dark:text-white">Resonance</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
