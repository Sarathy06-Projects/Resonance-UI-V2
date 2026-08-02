"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/useAuthStore";
import { getProfile, updateProfile, uploadAvatar, uploadCover, checkUsername } from "@/lib/api/users";
import { allTopics } from "@/lib/topics";
import { cn } from "@/lib/utils";

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;

export default function EditProfilePage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-xl font-bold mb-2">Sign in to edit your profile</h2>
      </div>
    );
  }

  return <EditProfileForm username={user.username} />;
}

function EditProfileForm({ username }: { username: string }) {
  const router = useRouter();
  const { user, syncSession } = useAuthStore();
  const { data: profile, isLoading, mutate } = useSWR(`profile-${username}`, () => getProfile(username));

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [toolbox, setToolbox] = useState<string[]>([]);
  const [toolboxDraft, setToolboxDraft] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (profile && !hasInitialized.current) {
      hasInitialized.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill once the profile loads
      setName(profile.name);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHandle(profile.username ?? "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBio(profile.bio ?? "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompany(profile.company ?? "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(profile.location ?? "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWebsiteUrl(profile.websiteUrl ?? "");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToolbox(profile.toolbox);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInterests(profile.interests);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile || handle === profile.username || handle.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(() => {
      checkUsername(handle)
        .then((r) => setUsernameAvailable(r.available))
        .catch(() => setUsernameAvailable(null));
    }, 350);
    return () => clearTimeout(timer);
  }, [handle, profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      await mutate();
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      await uploadCover(file);
      await mutate();
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  const toggleInterest = (topic: string) => {
    setInterests((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
  };

  const addToolboxTag = () => {
    const tag = toolboxDraft.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag || toolbox.length >= MAX_TAGS || toolbox.includes(tag)) {
      setToolboxDraft("");
      return;
    }
    setToolbox((prev) => [...prev, tag]);
    setToolboxDraft("");
  };

  const handleToolboxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addToolboxTag();
    } else if (e.key === "Backspace" && !toolboxDraft && toolbox.length > 0) {
      setToolbox((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfile({
        name,
        username: handle,
        bio,
        company,
        location,
        websiteUrl,
        toolbox,
        interests,
      });
      syncSession({
        id: updated.id,
        name: updated.name,
        username: updated.username ?? handle,
        avatar: updated.image ?? user?.avatar ?? "",
        email: user?.email,
        bio: updated.bio ?? undefined,
        role: updated.role ?? undefined,
        // This page requires an already-authenticated user, who by
        // definition already passed onboarding - carry the existing flag
        // forward rather than guessing.
        hasOnboarded: user?.hasOnboarded ?? true,
      });
      router.push(`/profile/${updated.username}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your profile.");
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return <div className="p-10 text-center text-zinc-400">Loading…</div>;
  }

  const canSave = name.trim().length > 0 && handle.trim().length >= 3 && usernameAvailable !== false && !isSaving;

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 sm:top-16 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-4 sm:py-5 flex items-center gap-4">
        <Link href={`/profile/${profile.username}`} className="p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Edit Profile</h1>
      </div>

      <div className="max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-10">
        {/* Cover + Avatar */}
        <section>
          <div className="h-36 sm:h-44 w-full relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
            {profile.coverImage && <img src={profile.coverImage} alt="" className="w-full h-full object-cover" />}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            <Button
              variant="secondary"
              size="sm"
              disabled={isUploadingCover}
              onClick={() => coverInputRef.current?.click()}
              className="absolute top-3 right-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm"
            >
              {isUploadingCover ? "Uploading…" : "Change Cover"}
            </Button>
          </div>

          <div className="flex items-center gap-4 -mt-10 ml-4">
            <div className="relative group">
              <Avatar className="w-20 h-20 border-4 border-white dark:border-zinc-950 shadow-lg bg-white dark:bg-zinc-900">
                <AvatarImage src={profile.image ?? undefined} />
                <AvatarFallback className="text-2xl font-bold">{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[11px] font-semibold"
              >
                {isUploadingAvatar ? "…" : "Change"}
              </button>
            </div>
          </div>
        </section>

        <Separator className="bg-zinc-100 dark:bg-zinc-800" />

        {/* Basics */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Basics</h2>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Full Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Username</label>
            <div className="relative">
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                className="h-12 rounded-xl pr-10"
              />
              {usernameAvailable === true && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />}
            </div>
            {usernameAvailable === false && <p className="text-sm text-red-500">That username isn&apos;t available.</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm min-h-[100px] outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
            />
            <p className="text-xs text-zinc-400 text-right">{bio.length}/280</p>
          </div>
        </section>

        <Separator className="bg-zinc-100 dark:bg-zinc-800" />

        {/* Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Details</h2>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Company</label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} className="h-12 rounded-xl" placeholder="Where do you work?" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Location</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} className="h-12 rounded-xl" placeholder="City, Country" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Website</label>
            <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} maxLength={300} className="h-12 rounded-xl" placeholder="https://" />
          </div>
        </section>

        <Separator className="bg-zinc-100 dark:bg-zinc-800" />

        {/* Toolbox */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Designer Toolbox</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">The tools you use, e.g. Figma, Framer.</p>
          <div className="flex flex-wrap gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900 min-h-[52px]">
            {toolbox.map((tool) => (
              <span key={tool} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium">
                {tool}
                <button type="button" onClick={() => setToolbox((prev) => prev.filter((t) => t !== tool))} aria-label={`Remove ${tool}`}>
                  <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" />
                </button>
              </span>
            ))}
            <input
              value={toolboxDraft}
              onChange={(e) => setToolboxDraft(e.target.value)}
              onKeyDown={handleToolboxKeyDown}
              onBlur={addToolboxTag}
              placeholder={toolbox.length === 0 ? "Type a tool and press Enter" : ""}
              disabled={toolbox.length >= MAX_TAGS}
              className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1.5"
            />
          </div>
        </section>

        <Separator className="bg-zinc-100 dark:bg-zinc-800" />

        {/* Interests */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Interests</h2>
          <div className="flex flex-wrap gap-2.5">
            {allTopics.map((topic) => {
              const isSelected = interests.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleInterest(topic)}
                  className={cn(
                    "px-4 py-2 rounded-full border-2 transition-all font-medium text-sm",
                    isSelected
                      ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700"
                  )}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </section>

        {saveError && <p className="text-sm text-red-500">{saveError}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl h-12 px-6">
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={handleSave} className="rounded-xl h-12 px-8 font-semibold">
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
