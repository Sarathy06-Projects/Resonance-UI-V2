"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { completeOnboarding } from "@/lib/api/onboarding";
import { checkUsername, uploadAvatar } from "@/lib/api/users";
import { authClient } from "@/lib/auth-client";
import { useAuthStore } from "@/store/useAuthStore";
import { allTopics } from "@/lib/topics";

const roles = [
  "UI Designer", "UX Designer", "Product Designer",
  "Graphic Designer", "Motion Designer", "Student"
];

export default function OnboardingPage() {
  const router = useRouter();
  const syncSession = useAuthStore((s) => s.syncSession);
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [isOtherRole, setIsOtherRole] = useState(false);
  const [manualRole, setManualRole] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [profile, setProfile] = useState({ name: "", username: "", bio: "" });
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameReason, setUsernameReason] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Avatar. The circle on step 3 used to be decoration - a cursor-pointer div
  // with a hover label that read "Upload" and did nothing at all. It is wired
  // to the same POST /api/users/me/avatar the profile editor uses.
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  useEffect(() => {
    if (profile.username.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting on input change, not syncing external state
      setUsernameAvailable(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsernameReason(null);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a check is about to start
    setIsCheckingUsername(true);
    const timer = setTimeout(() => {
      checkUsername(profile.username)
        .then((r) => {
          setUsernameAvailable(r.available);
          setUsernameReason(r.available ? null : (r.reason ?? "That username isn't available."));
        })
        .catch(() => {
          setUsernameAvailable(null);
          setUsernameReason(null);
        })
        .finally(() => setIsCheckingUsername(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [profile.username]);

  // Uploads immediately on pick rather than deferring to "Join Resonance".
  // The endpoint writes user.image itself, so there is nothing to carry into
  // completeOnboarding - and picking a file then seeing the old placeholder
  // until the very last step is the kind of thing that reads as broken.
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    setAvatarError(null);
    try {
      const { image } = await uploadAvatar(file);
      setAvatarUrl(image);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Couldn't upload that image.");
    } finally {
      setIsUploadingAvatar(false);
      // Reset so picking the same file again still fires a change event.
      e.target.value = "";
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    setFinishError(null);
    try {
      const updated = await completeOnboarding({
        role: selectedRole,
        topics: selectedTopics,
        name: profile.name || undefined,
        username: profile.username || undefined,
        bio: profile.bio || undefined,
      });
      // completeOnboarding() is a raw DB write on the backend, bypassing
      // better-auth's own update path entirely - it never touches the
      // frontend's session cookie cache (lib/auth.ts's 5-minute
      // cookieCache). Without this, the cache keeps serving the
      // pre-onboarding snapshot (onboardedAt: null) on every request until
      // it naturally expires, so a refresh right after finishing onboarding
      // reads stale data and OnboardingGuard bounces the user straight back
      // here. Force a cache-bypassing session fetch so the response sets a
      // fresh cache cookie reflecting the real, now-onboarded state -
      // best-effort: the local zustand state below is already correct for
      // this tab regardless of whether this call succeeds.
      await authClient.getSession({ query: { disableCookieCache: true } }).catch(() => {});
      syncSession({
        id: updated.id,
        name: updated.name,
        username: updated.username ?? "",
        avatar: updated.image ?? `https://api.dicebear.com/9.x/glass/svg?seed=${updated.id}`,
        role: updated.role ?? undefined,
        // The whole point of this page - mark it done immediately so the
        // OnboardingGuard doesn't redirect right back here the instant it
        // re-renders after this navigation.
        hasOnboarded: true,
      });
      router.push("/");
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : "Something went wrong finishing setup.");
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="w-full flex flex-col pt-8 sm:pt-12">
      <div className="flex items-center justify-center gap-2 mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className={cn("h-2 rounded-full transition-all duration-500", step >= s ? "bg-zinc-950 dark:bg-white w-8" : "bg-zinc-200 dark:bg-zinc-800 w-2")} />
        ))}
      </div>

      <div className="w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col space-y-8"
            >
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight dark:text-white">What best describes you?</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">Help us personalize your Resonance experience.</p>
              </div>

              <div className="space-y-4 max-w-md mx-auto w-full">
                <div className="relative">
                  <select 
                    className="w-full h-14 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-lg px-4 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white transition-all appearance-none cursor-pointer pr-12"
                    value={isOtherRole ? "Other" : selectedRole}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Other") {
                        setIsOtherRole(true);
                        setSelectedRole(manualRole);
                      } else {
                        setIsOtherRole(false);
                        setSelectedRole(val);
                      }
                    }}
                  >
                    <option value="" disabled>Select your role...</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                    <option value="Other">Other (Please specify)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                </div>

                <AnimatePresence>
                  {isOtherRole && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <Input 
                        placeholder="e.g. Design Engineer" 
                        className="h-14 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 text-lg px-4 dark:text-white dark:placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:border-zinc-950 dark:focus-visible:border-white transition-all"
                        value={manualRole}
                        onChange={(e) => {
                          setManualRole(e.target.value);
                          setSelectedRole(e.target.value);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-8 flex justify-end">
                <Button 
                  size="lg" 
                  disabled={!selectedRole}
                  onClick={() => setStep(2)}
                  className="rounded-xl px-10 h-14 text-base font-semibold dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col space-y-8"
            >
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight dark:text-white">What do you love exploring?</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">Choose at least 5 topics to tune your feed.</p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {allTopics.map((topic) => {
                  const isSelected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={cn(
                        "px-6 py-3 rounded-full border-2 transition-all font-medium text-sm sm:text-base",
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

              <div className="pt-8 flex justify-between items-center">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                  {selectedTopics.length}/5 selected
                </span>
                <div className="flex gap-4">
                  <Button variant="ghost" size="lg" onClick={() => setStep(1)} className="rounded-xl dark:text-zinc-300 dark:hover:bg-zinc-800">Back</Button>
                  <Button 
                    size="lg" 
                    disabled={selectedTopics.length < 5}
                    onClick={() => setStep(3)}
                    className="rounded-xl px-10 h-14 text-base font-semibold dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col space-y-8 max-w-lg mx-auto w-full"
            >
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight dark:text-white">Set up your profile</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">Add details so others can recognize you.</p>
              </div>

              <div className="flex flex-col items-center py-4">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                {/* A real button, not a div with cursor-pointer: this is the
                    control that opens the picker, so it needs to be reachable
                    by keyboard and to announce itself. */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label={avatarUrl ? "Change your profile photo" : "Upload a profile photo"}
                  className="relative group rounded-full outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/20 dark:focus-visible:ring-white/20 disabled:cursor-wait"
                >
                  <Avatar className="w-28 h-28 border-4 border-white dark:border-zinc-950 shadow-xl">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="" className="object-cover" />}
                    <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-3xl">
                      {profile.name.trim().charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {/* Always visible while uploading, hover-only otherwise -
                      on touch there is no hover, so a purely hover-revealed
                      affordance is invisible on exactly the devices where the
                      camera roll is closest to hand. */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-black/40 rounded-full flex items-center justify-center transition-opacity",
                      isUploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                    )}
                  >
                    <span className="text-white text-xs font-semibold">
                      {isUploadingAvatar ? "Uploading…" : avatarUrl ? "Change" : "Upload"}
                    </span>
                  </div>
                </button>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  {avatarUrl ? "Looking good." : "Add a photo (optional)"}
                </p>
                {avatarError && <p className="mt-1 text-sm text-red-500">{avatarError}</p>}
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1 dark:text-zinc-300">Full Name</label>
                  <Input
                    placeholder="Jane Doe"
                    maxLength={80}
                    className="h-14 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-lg px-4 dark:text-white dark:placeholder:text-zinc-500"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2 relative">
                  <label className="text-sm font-semibold ml-1 dark:text-zinc-300">Username</label>
                  <div className="relative">
                    <Input
                      placeholder="janedoe"
                      maxLength={30}
                      className="h-14 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-lg pl-10 pr-12 dark:text-white dark:placeholder:text-zinc-500"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-lg font-semibold">@</span>
                    {usernameAvailable === true && (
                      <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />
                    )}
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-sm text-red-500 ml-1">{usernameReason}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1 dark:text-zinc-300">Bio (Optional)</label>
                  <Input
                    placeholder="Designer crafting interfaces..."
                    maxLength={280}
                    className="h-14 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-lg px-4 dark:text-white dark:placeholder:text-zinc-500"
                    value={profile.bio}
                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  />
                </div>
              </div>

              {finishError && <p className="text-sm text-red-500 text-center">{finishError}</p>}

              <div className="pt-8 flex justify-between items-center">
                <Button variant="ghost" size="lg" onClick={() => setStep(2)} className="rounded-xl dark:text-zinc-300 dark:hover:bg-zinc-800">Back</Button>
                <Button
                  size="lg"
                  disabled={!profile.name || usernameAvailable !== true || isCheckingUsername || isFinishing}
                  onClick={handleFinish}
                  className="rounded-xl px-10 h-14 text-base font-semibold dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isFinishing ? "Setting up..." : isCheckingUsername ? "Checking username…" : "Join Resonance"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
