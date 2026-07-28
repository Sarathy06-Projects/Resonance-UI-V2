"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { updateProfile, changePassword, deleteAccount } from "@/lib/api/users";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // The Zustand user store loads asynchronously after mount (SessionSync),
  // so the form fields need a one-time sync once it arrives - guarded so it
  // never clobbers edits the user has already started making.
  const hasInitializedForm = useRef(false);
  useEffect(() => {
    if (user && !hasInitializedForm.current) {
      hasInitializedForm.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(user.name);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsername(user.username);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBio(user.bio ?? "");
    }
  }, [user]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-bold mb-2">Sign in to view settings</h2>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);
    try {
      const updated = await updateProfile({ name, username, bio });
      useAuthStore.getState().syncSession({
        id: updated.id,
        name: updated.name,
        username: updated.username ?? username,
        avatar: updated.image ?? user.avatar,
        bio: updated.bio ?? undefined,
        role: updated.role ?? undefined,
      });
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

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
            <Button
              variant="outline"
              className="rounded-xl h-10 px-6"
              disabled={isChangingPassword || !currentPassword || newPassword.length < 8}
              onClick={handleChangePassword}
            >
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </section>

        <Separator className="bg-zinc-100" />

        {/* Profile Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Profile</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Display Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-50 border-zinc-200 h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-zinc-50 border-zinc-200 h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm min-h-[100px] outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
            {profileMessage && <p className="text-sm text-emerald-600">{profileMessage}</p>}
            {profileError && <p className="text-sm text-red-500">{profileError}</p>}
            <Button className="rounded-xl h-12 px-8 font-semibold w-full sm:w-auto" disabled={isSavingProfile} onClick={handleSaveProfile}>
              {isSavingProfile ? "Saving..." : "Save Changes"}
            </Button>
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
