"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  return error instanceof Error ? error.message : fallback;
}

export function ErrorState({ title = "Couldn't load this", error, message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full min-h-[40vh] text-center px-4", className)}>
      <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-400 dark:text-red-500" />
      </div>
      <h3 className="text-lg font-bold dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">
        {message ?? errorMessage(error)}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-9 px-4 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
