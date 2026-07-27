"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-bold mb-2">Sign in to view settings</h2>
      </div>
    );
  }

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
              <Input defaultValue="design@example.com" disabled className="bg-zinc-50 border-zinc-200 h-12 rounded-xl" />
            </div>
            <Button variant="outline" className="rounded-xl h-10 px-6">Change Password</Button>
          </div>
        </section>

        <Separator className="bg-zinc-100" />

        {/* Profile Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Profile</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Display Name</label>
              <Input defaultValue={user.name} className="bg-zinc-50 border-zinc-200 h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Username</label>
              <Input defaultValue={user.username} className="bg-zinc-50 border-zinc-200 h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">Bio</label>
              <textarea 
                defaultValue={user.bio} 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm min-h-[100px] outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
            <Button className="rounded-xl h-12 px-8 font-semibold w-full sm:w-auto">Save Changes</Button>
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
            <Button variant="destructive" className="rounded-xl h-12 px-8 font-semibold w-full sm:w-auto bg-red-500 hover:bg-red-600">
              Delete Account
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
