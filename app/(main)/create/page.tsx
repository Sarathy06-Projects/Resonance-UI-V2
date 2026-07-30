"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, ChevronDown,
  Globe, Users, Lock, Check, Loader2, PenTool,
  MessageSquare, HelpCircle, FileText, UploadCloud, Layers, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ArticleEditor } from "@/components/editor/ArticleEditor";
import { getDraft, createDraft, updateDraft, publishDraft } from "@/lib/api/drafts";
import { uploadArticleCover } from "@/lib/api/uploads";
import { ImageAttachButton, ImageAttachmentsGrid } from "@/components/shared/ImageAttachments";
import { createSeries, getUserSeries } from "@/lib/api/series";
import type { Series } from "@/lib/api/types";

const TOPICS = [
  "UI Design", "UX", "Typography", "Accessibility",
  "Research", "Motion", "Design Systems", "Branding",
  "Illustration", "AI"
];

const FEEDBACK_TYPES = [
  "Visual Design", "UX", "Research", "Accessibility", "Interaction", "Prototype"
];

type Mode = "discussion" | "showcase" | "feedback" | "article";

function estimateWordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400">Loading…</div>}>
      <CreatePageInner />
    </Suspense>
  );
}

function CreatePageInner() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId");

  const [mode, setMode] = useState<Mode>("article");
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("public");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Discussion/showcase/feedback attachments (X/Threads-style).
  const [postImages, setPostImages] = useState<string[]>([]);

  // Article-only: Dribbble-style shot gallery + Medium-style series.
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [userSeries, setUserSeries] = useState<Series[]>([]);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");

  const [toolsUsed, setToolsUsed] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");

  const [feedbackType, setFeedbackType] = useState("");
  const [urgency, setUrgency] = useState("Flexible");
  const [figmaLink, setFigmaLink] = useState("");

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const draftId = useRef<string | null>(draftIdParam);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedDraft = useRef(false);

  // Load an existing draft if navigated here with ?draftId=
  useEffect(() => {
    if (!draftIdParam || hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;
    getDraft(draftIdParam).then((draft) => {
      setMode(draft.mode);
      setTitle(draft.title ?? "");
      setContent(draft.content ?? "");
      setCoverImage(draft.coverImage);
      const meta = draft.meta ?? {};
      if (Array.isArray(meta.tags)) setSelectedTopics(meta.tags as string[]);
      if (typeof meta.toolsUsed === "string") setToolsUsed(meta.toolsUsed);
      if (typeof meta.portfolioLink === "string") setPortfolioLink(meta.portfolioLink);
      if (typeof meta.feedbackType === "string") setFeedbackType(meta.feedbackType);
      if (typeof meta.urgency === "string") setUrgency(meta.urgency);
      if (typeof meta.figmaLink === "string") setFigmaLink(meta.figmaLink);
      if (Array.isArray(meta.images) && draft.mode === "article") setGalleryImages(meta.images as string[]);
      if (Array.isArray(meta.images) && draft.mode !== "article") setPostImages(meta.images as string[]);
      if (typeof meta.seriesId === "string") setSeriesId(meta.seriesId);
    }).catch(() => {});
  }, [draftIdParam]);

  // Load the author's existing series for the "add to series" picker.
  useEffect(() => {
    if (!user) return;
    getUserSeries(user.id).then((res) => setUserSeries(res.series)).catch(() => {});
  }, [user]);

  // Debounced autosave.
  useEffect(() => {
    if (!title && !content) return;
    const timer = setTimeout(async () => {
      const payload = {
        mode,
        title: title || undefined,
        content: content || undefined,
        coverImage: coverImage ?? undefined,
        meta: {
          tags: selectedTopics,
          toolsUsed,
          portfolioLink,
          feedbackType,
          urgency,
          figmaLink,
          images: mode === "article" ? galleryImages : postImages,
          seriesId: seriesId ?? undefined,
        },
      };
      try {
        if (draftId.current) {
          await updateDraft(draftId.current, payload);
        } else {
          const created = await createDraft(payload);
          draftId.current = created.id;
        }
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {
        // Autosave failures are silent - the user's content stays in local state.
      }
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, mode, selectedTopics, toolsUsed, portfolioLink, feedbackType, urgency, figmaLink, coverImage, postImages, galleryImages, seriesId]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const isPublishReady = () => {
    if (mode === "discussion") return content.trim().length > 0;
    if (mode === "showcase") return title.trim().length > 0 && content.trim().length > 0;
    if (mode === "feedback") return title.trim().length > 0 && content.trim().length > 0 && feedbackType !== "";
    if (mode === "article") return title.trim().length > 0 && content.trim().length > 0;
    return false;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const result = await uploadArticleCover(file);
      setCoverImage(result.url);
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  const handlePublish = async () => {
    if (!isPublishReady()) return;
    setIsPublishing(true);
    try {
      const meta = {
        tags: selectedTopics,
        toolsUsed,
        portfolioLink,
        feedbackType,
        urgency,
        figmaLink,
        images: mode === "article" ? galleryImages : postImages,
        seriesId: seriesId ?? undefined,
      };
      if (!draftId.current) {
        const created = await createDraft({
          mode,
          title: title || undefined,
          content,
          coverImage: coverImage ?? undefined,
          meta,
        });
        draftId.current = created.id;
      } else {
        await updateDraft(draftId.current, {
          mode,
          title: title || undefined,
          content,
          coverImage: coverImage ?? undefined,
          meta,
        });
      }

      const result = await publishDraft(draftId.current);
      setPublishSuccess(true);
      setTimeout(() => {
        router.push(result.resultType === "article" ? `/article/${result.id}` : `/post/${result.id}`);
      }, 1200);
    } catch {
      setIsPublishing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-[calc(100vh-80px)]">
        <h2 className="text-3xl font-bold tracking-tight mb-3 dark:text-white">Every great design conversation starts with an idea.</h2>
        <p className="text-zinc-500 mb-8 max-w-md dark:text-zinc-400">Join Resonance to share your work, ask for feedback, and publish articles to the community.</p>
        <Button onClick={() => router.push("/login")} className="rounded-full px-8 h-12 text-md font-semibold dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
          Sign In to Write
        </Button>
      </div>
    );
  }

  const checklist = [
    { label: "Add a title", done: mode === "discussion" || title.trim().length > 0 },
    { label: "Write content", done: content.trim().length > 10 },
    ...(mode === "article" ? [{ label: "Select topics", done: selectedTopics.length > 0 }] : []),
  ];
  if (mode === "feedback") checklist.push({ label: "Select feedback type", done: feedbackType !== "" });

  const words = estimateWordCount(mode === "article" ? content.replace(/<[^>]*>/g, " ") : content);
  const readTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 pb-20 md:pb-0">

      <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 sm:px-8 h-16 flex items-center justify-between">

        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 px-3 py-1.5 rounded-lg transition-colors">
          {visibility === "public" && <Globe className="w-4 h-4 text-emerald-500" />}
          {visibility === "followers" && <Users className="w-4 h-4 text-blue-500" />}
          {visibility === "private" && <Lock className="w-4 h-4 text-zinc-500" />}
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            className="bg-transparent outline-none cursor-pointer capitalize"
          >
            <option value="public">Public</option>
            <option value="followers">Followers</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {lastSaved && !isPublishing && !publishSuccess && (
              <motion.span
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hidden sm:block"
              >
                Draft saved {lastSaved}
              </motion.span>
            )}
          </AnimatePresence>

          <Button
            onClick={handlePublish}
            disabled={!isPublishReady() || isPublishing || publishSuccess}
            className={cn(
              "rounded-full px-6 font-semibold shadow-sm transition-all duration-300 relative overflow-hidden",
              publishSuccess ? "bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white" : "dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            )}
          >
            <AnimatePresence mode="wait">
              {isPublishing ? (
                <motion.div key="publishing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing
                </motion.div>
              ) : publishSuccess ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                  <Check className="w-4 h-4" /> Published
                </motion.div>
              ) : (
                <motion.span key="idle">Publish</motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1200px] mx-auto flex flex-col lg:flex-row items-stretch">

        <div className="flex-1 flex flex-col px-4 sm:px-8 py-8 min-w-0">

          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-1 rounded-2xl flex items-center mb-10 overflow-x-auto no-scrollbar border border-zinc-100 dark:border-zinc-800 shrink-0">
            {[
              { id: "discussion" as const, icon: MessageSquare, label: "Discussion" },
              { id: "showcase" as const, icon: PenTool, label: "Showcase" },
              { id: "feedback" as const, icon: HelpCircle, label: "Request Feedback" },
              { id: "article" as const, icon: FileText, label: "Article" }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-colors whitespace-nowrap",
                  mode === m.id ? "text-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                <m.icon className="w-4 h-4 shrink-0" />
                {m.label}
                {mode === m.id && (
                  <motion.div layoutId="mode-indicator" className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                )}
              </button>
            ))}
          </div>

          <div className="max-w-[700px] w-full mx-auto space-y-8 pb-20">

            {mode !== "discussion" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <input
                  type="text"
                  placeholder={
                    mode === "showcase" ? "Project Title..." :
                    mode === "feedback" ? "What design are you sharing?" :
                    "Article Title..."
                  }
                  className={cn(
                    "w-full bg-transparent outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-colors dark:text-white font-bold",
                    mode === "article" ? "text-4xl sm:text-5xl" : "text-3xl"
                  )}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </motion.div>
            )}

            {mode === "article" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                {coverImage ? (
                  <div className="relative w-full h-48 sm:h-64 rounded-3xl overflow-hidden group cursor-pointer" onClick={() => coverInputRef.current?.click()}>
                    <img src={coverImage} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-semibold">
                      Change cover
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="w-full h-48 sm:h-64 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-sm">{isUploadingCover ? "Uploading..." : "Add Cover Image"}</span>
                    <span className="text-xs mt-1 opacity-70">Click to upload</span>
                  </button>
                )}
              </motion.div>
            )}

            {(mode === "showcase" || mode === "feedback") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid sm:grid-cols-2 gap-4">
                {mode === "feedback" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Feedback Type</label>
                    <select
                      className="w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium outline-none focus:border-zinc-400 dark:focus:border-zinc-600 dark:text-white"
                      value={feedbackType} onChange={e => setFeedbackType(e.target.value)}
                    >
                      <option value="" disabled>Select area of focus...</option>
                      {FEEDBACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                {mode === "feedback" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Figma / Prototype Link</label>
                    <input
                      type="text" placeholder="https://figma.com/..."
                      className="w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium outline-none focus:border-zinc-400 dark:focus:border-zinc-600 dark:text-white"
                      value={figmaLink} onChange={e => setFigmaLink(e.target.value)}
                    />
                  </div>
                )}
                {mode === "showcase" && (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tools Used (Comma separated)</label>
                    <input
                      type="text" placeholder="Figma, Spline, React..."
                      className="w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium outline-none focus:border-zinc-400 dark:focus:border-zinc-600 dark:text-white"
                      value={toolsUsed} onChange={e => setToolsUsed(e.target.value)}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {mode === "article" ? (
              <ArticleEditor content={content} onChange={setContent} />
            ) : (
              <>
                <textarea
                  placeholder={
                    mode === "discussion" ? "What design question is on your mind?" :
                    mode === "showcase" ? "Describe your project and design process..." :
                    "What specific feedback are you looking for?"
                  }
                  className="w-full min-h-[300px] bg-transparent resize-none outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 dark:text-zinc-200 font-serif leading-relaxed text-lg font-sans"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="space-y-3">
                  <ImageAttachmentsGrid images={postImages} onChange={setPostImages} />
                  <ImageAttachButton images={postImages} onChange={setPostImages} />
                </div>
              </>
            )}

            {mode === "article" && (
              <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800/60 space-y-8">
                <div>
                  <label className="text-sm font-bold dark:text-white mb-3 block flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-400" /> Select Topics
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map(topic => {
                      const isSelected = selectedTopics.includes(topic);
                      return (
                        <button
                          key={topic}
                          onClick={() => toggleTopic(topic)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-sm font-semibold transition-all border",
                            isSelected
                              ? "bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-sm"
                              : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700"
                          )}
                        >
                          {topic}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold dark:text-white mb-3 block flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-zinc-400" /> Gallery (extra shot images)
                  </label>
                  <div className="space-y-3">
                    <ImageAttachmentsGrid images={galleryImages} onChange={setGalleryImages} />
                    <ImageAttachButton images={galleryImages} onChange={setGalleryImages} max={10} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold dark:text-white mb-3 block flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-400" /> Series
                  </label>
                  {isCreatingSeries ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Series title..."
                        value={newSeriesTitle}
                        onChange={(e) => setNewSeriesTitle(e.target.value)}
                        className="flex-1 h-11 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium outline-none focus:border-zinc-400 dark:focus:border-zinc-600 dark:text-white"
                      />
                      <Button
                        type="button"
                        className="h-11 rounded-xl px-4"
                        disabled={!newSeriesTitle.trim()}
                        onClick={async () => {
                          const created = await createSeries({ title: newSeriesTitle.trim() });
                          setUserSeries((prev) => [created, ...prev]);
                          setSeriesId(created.id);
                          setIsCreatingSeries(false);
                          setNewSeriesTitle("");
                        }}
                      >
                        Create
                      </Button>
                      <Button type="button" variant="outline" className="h-11 rounded-xl px-4" onClick={() => setIsCreatingSeries(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={seriesId ?? ""}
                        onChange={(e) => setSeriesId(e.target.value || null)}
                        className="h-11 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium outline-none focus:border-zinc-400 dark:focus:border-zinc-600 dark:text-white"
                      >
                        <option value="">Not part of a series</option>
                        {userSeries.map((s) => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsCreatingSeries(true)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                      >
                        <Plus className="w-4 h-4" /> New series
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="hidden lg:flex flex-col w-[340px] shrink-0 border-l border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/10 p-8">

          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">Draft Status</h3>
            <div className="space-y-3">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center transition-colors", item.done ? "bg-emerald-500 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-transparent")}>
                    <Check className="w-3 h-3" />
                  </div>
                  <span className={cn("text-sm font-medium transition-colors", item.done ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600")}>
                    {item.label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center transition-colors", isPublishReady() ? "bg-blue-500 text-white shadow-sm shadow-blue-500/20" : "bg-zinc-200 dark:bg-zinc-800 text-transparent")}>
                  <Check className="w-3 h-3" />
                </div>
                <span className={cn("text-sm font-bold transition-colors", isPublishReady() ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-600")}>
                  Ready to Publish
                </span>
              </div>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="text-2xl font-bold dark:text-white mb-1">{words}</div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Words</div>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="text-2xl font-bold dark:text-white mb-1">{readTime}m</div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Read Time</div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5">
            <h3 className="font-bold text-blue-800 dark:text-blue-400 text-sm mb-2 flex items-center gap-2">
              <PenTool className="w-4 h-4" /> Writing Tips
            </h3>
            <p className="text-sm text-blue-700/80 dark:text-blue-300/70 leading-relaxed">
              {mode === "discussion" && "Ask a clear, concise question. Including a specific scenario helps get better answers."}
              {mode === "showcase" && "Share the context behind your design. What problem were you solving? What tools did you use?"}
              {mode === "feedback" && "Be specific about what kind of feedback you want. If it's typography, mention it in the title!"}
              {mode === "article" && "Use headings to break up long text. Adding visual examples dramatically increases reading time."}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
