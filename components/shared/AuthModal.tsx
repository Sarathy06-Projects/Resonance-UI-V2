"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuthStore();

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={closeAuthModal}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl dark:bg-zinc-950">
        <div className="p-8 pb-6">
          <DialogHeader className="space-y-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto mb-4"
            >
              <Logo size={48} className="mx-auto" />
            </motion.div>
            <DialogTitle className="text-2xl font-bold text-center tracking-tight">Join Resonance</DialogTitle>
            <DialogDescription className="text-center text-base">
              Create an account to join discussions, share your work, and connect with other designers.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-8 pt-0 flex flex-col gap-3">
          <Button size="lg" className="w-full rounded-xl font-semibold h-12 shadow-sm" render={<Link href="/signup" onClick={closeAuthModal} />}>
            Create account
          </Button>
          <Button variant="outline" size="lg" className="w-full rounded-xl font-semibold h-12 border-zinc-200 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800" render={<Link href="/login" onClick={closeAuthModal} />}>
            Log in
          </Button>
          <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 font-medium mt-4 px-4">
            By joining, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
