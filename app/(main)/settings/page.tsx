"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, ChevronRight, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { changePassword, deleteAccount } from "@/lib/api/users";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-bold mb-2">Sign in to view settings</h2>
      </div>
    );
  }

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Couldn't change your password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!user.email) return;
    setIsSendingReset(true);
    setResetMessage(null);
    try {
      await authClient.requestPasswordReset({ email: user.email, redirectTo: "/reset-password" });
      setResetMessage("Check your email for a link to reset your password.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      await authClient.signOut();
      logout();
      router.push("/");
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 sm:top-16 z-10 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-4 py-4 sm:py-5">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="max-w-2xl p-4 sm:p-6 space-y-10">

        {/* Profile */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Profile</h2>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <Link href="/settings/profile" className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors">
              <span className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-zinc-500" />
                <span className="text-sm font-medium">Edit Profile</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
          </div>
        </section>

        <Separator className="bg-zinc-100" />

        {/* Account Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Account</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Email Address</label>
              <Input defaultValue={user.email ?? ""} disabled className="bg-zinc-50 border-zinc-200 h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Current Password</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">New Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 rounded-xl" />
            </div>
            {passwordMessage && <p className="text-sm text-emerald-600">{passwordMessage}</p>}
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="outline"
                className="rounded-xl h-10 px-6"
                disabled={isChangingPassword || !currentPassword || newPassword.length < 8}
                onClick={handleChangePassword}
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
              <button
                type="button"
                onClick={handleSendResetLink}
                disabled={isSendingReset}
                className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                {isSendingReset ? "Sending..." : "Forgot your password?"}
              </button>
            </div>
            {resetMessage && <p className="text-sm text-emerald-600">{resetMessage}</p>}
          </div>
        </section>

        <Separator className="bg-zinc-100" />

        {/* Activity */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Activity</h2>
          <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
            <Link href="/activity?tab=liked" className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors">
              <span className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-zinc-500" />
                <span className="text-sm font-medium">Posts You&apos;ve Liked</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
            <Link href="/activity?tab=commented" className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors">
              <span className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-zinc-500" />
                <span className="text-sm font-medium">Comments</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
          </div>
        </section>

        <Separator className="bg-zinc-100" />

        {/* Danger Zone */}
        <section className="space-y-4 pt-4">
          <h2 className="text-lg font-bold text-red-600">Danger Zone</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={logout} variant="outline" className="rounded-xl h-12 px-8 font-semibold w-full sm:w-auto text-zinc-700 border-zinc-200">
              Log Out
            </Button>
            {showDeleteConfirm ? (
              <div className="flex gap-2 items-center">
                <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteAccount} className="rounded-xl h-12 px-8 font-semibold bg-red-500 hover:bg-red-600">
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </Button>
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="rounded-xl h-12 px-4">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="rounded-xl h-12 px-8 font-semibold w-full sm:w-auto bg-red-500 hover:bg-red-600">
                Delete Account
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
