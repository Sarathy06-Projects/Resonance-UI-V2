"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Users, Lock, Check, Loader2, PenTool, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArticleEditor } from "@/components/editor/ArticleEditor";
import { getDraft, createDraft, updateDraft, publishDraft } from "@/lib/api/drafts";
import { uploadArticleCover } from "@/lib/api/uploads";
import { ImageAttachButton, ImageAttachmentsGrid } from "@/components/shared/ImageAttachments";
import { articleUrl, postUrl } from "@/lib/urls";

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

  // ?type= picks the starting mode. The compose flow has always linked here
  // with one (CreateTypeDialog sends ?type=article, the composer's handoff rail
  // sends showcase/feedback), but the param was read by nothing - so every
  // handoff landed on the article editor whatever it asked for, and choosing
  // "Showcase" silently opened the wrong surface. Validated against Mode rather
  // than cast, so a hand-typed ?type=nonsense falls back instead of putting the
  // page into a mode none of its branches handle.
  const typeParam = searchParams.get("type");
  const initialMode: Mode =
    typeParam === "discussion" || typeParam === "showcase" || typeParam === "feedback" || typeParam === "article"
      ? typeParam
      : "article";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("public");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Discussion/showcase/feedback attachments (X/Threads-style).
  const [postImages, setPostImages] = useState<string[]>([]);

  // Article-only: Dribbble-style shot gallery + Medium-style series.
  // Gallery and series no longer have UI on this page, but both still round-
  // trip: a draft saved when they did keeps its values through autosave and
  // publish instead of being silently emptied by the next keystroke.
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [seriesId, setSeriesId] = useState<string | null>(null);

  const [toolsUsed, setToolsUsed] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");

  const [feedbackType, setFeedbackType] = useState("");
  const [urgency, setUrgency] = useState("Flexible");
  const [figmaLink, setFigmaLink] = useState("");

  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  // Confirmation that lives on the button itself. The "Draft saved 10:00"
  // stamp beside it is hidden below sm - there is no room for it next to
  // Save and Publish on a phone - so without this, tapping Save on mobile
  // changes nothing on screen and reads as a dead control.
  const [justSaved, setJustSaved] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  // One place the draft payload is described. Autosave, the Save draft button
  // and publish all write the same shape, and this is what stops them drifting
  // apart as fields come and go.
  const buildDraftPayload = useCallback(() => ({
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
  }), [mode, title, content, coverImage, selectedTopics, toolsUsed, portfolioLink, feedbackType, urgency, figmaLink, galleryImages, postImages, seriesId]);

  // Writes the draft immediately and returns its id, creating it on first
  // call. Throws on failure so callers can decide - autosave swallows it,
  // the explicit button reports it.
  const persistDraft = useCallback(async () => {
    const payload = buildDraftPayload();
    if (draftId.current) {
      await updateDraft(draftId.current, payload);
    } else {
      const created = await createDraft(payload);
      draftId.current = created.id;
    }
    setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    return draftId.current!;
  }, [buildDraftPayload]);

  // Debounced autosave. persistDraft is rebuilt whenever any saved field
  // changes, which re-runs this and resets the timer - that identity change is
  // the debounce, not an accident of the dependency array.
  useEffect(() => {
    if (!title && !content) return;
    const timer = setTimeout(() => {
      // Silent: the content is still in local state, and an error toast that
      // fires every 1.2s while the network is flaky is worse than nothing.
      void persistDraft().catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [title, content, persistDraft]);

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
    setSaveError(null);
    try {
      const id = await persistDraft();
      const result = await publishDraft(id);
      setPublishSuccess(true);
      setTimeout(() => {
        router.push(result.resultType === "article" ? articleUrl(result) : postUrl(result));
      }, 1200);
    } catch {
      setSaveError("Couldn't publish. Your draft is saved - try again.");
      setIsPublishing(false);
    }
  };

  // Explicit save, for the writer who does not know there is an autosave and
  // wants to see something happen before they close the tab.
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setSaveError(null);
    try {
      await persistDraft();
      setJustSaved(true);
    } catch {
      setSaveError("Couldn't save your draft. Check your connection.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Let the "Saved" confirmation fade back to the resting label.
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(t);
  }, [justSaved]);

  // Saves on the way out rather than asking. The debounce is 1.2s, so closing
  // straight after a keystroke would otherwise drop the last thing typed - and
  // a confirm dialog to protect work that is already being autosaved is a
  // prompt that trains people to dismiss prompts.
  const handleClose = async () => {
    if (title || content) {
      setIsClosing(true);
      await persistDraft().catch(() => {});
    }
    // A deep link or a fresh tab has nothing behind it, and router.back()
    // there walks the writer out of the site entirely. Same fallback the
    // mobile header's chevron uses.
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
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

        <div className="flex items-center gap-2 min-w-0">
          {/* /create is full-bleed - hidesMobileChrome strips the tab bar and
              header here - so without this there is no way out of the editor
              at all except the browser's own back button. */}
          <button
            type="button"
            onClick={handleClose}
            disabled={isClosing || isPublishing}
            aria-label="Close editor"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            {isClosing ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <X className="h-[18px] w-[18px]" />}
          </button>

          {/* Hidden while writing an article, which is the surface that is
              meant to be title + cover + tools and nothing else. Articles
              publish public, which is the value this control already defaulted
              to. Other modes keep it - a showcase or a feedback request is
              exactly the kind of thing someone limits to followers. */}
          {mode !== "article" && (
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 px-3 py-1.5 rounded-lg transition-colors">
              {visibility === "public" && <Globe className="w-4 h-4 text-emerald-500" />}
              {visibility === "followers" && <Users className="w-4 h-4 text-blue-500" />}
              {visibility === "private" && <Lock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />}
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
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <AnimatePresence>
            {saveError ? (
              <motion.span
                key="save-error"
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                role="alert"
                className="text-xs font-medium text-red-500 hidden sm:block"
              >
                {saveError}
              </motion.span>
            ) : lastSaved && !isPublishing && !publishSuccess ? (
              <motion.span
                key="saved-at"
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hidden sm:block"
              >
                Draft saved {lastSaved}
              </motion.span>
            ) : null}
          </AnimatePresence>

          {/* Autosave already runs, but it is invisible until it has fired
              once - and "did that save?" is the question people close a tab
              wondering. This answers it on demand. */}
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isPublishing || publishSuccess || (!title && !content)}
            className="rounded-full px-4 font-semibold text-zinc-600 dark:text-zinc-300"
          >
            {isSavingDraft ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : justSaved ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : null}
            <span className="hidden sm:inline">{isSavingDraft ? "Saving" : justSaved ? "Saved" : "Save draft"}</span>
            <span className="sm:hidden">{isSavingDraft ? "" : justSaved ? "Saved" : "Save"}</span>
          </Button>

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

          {/* The mode switcher is gone. What you are making is decided before
              you get here - CreateTypeDialog asks post-or-article, and a draft
              opened by id carries its own mode - so a four-tab control at the
              top of the page was re-asking a question already answered, and
              putting three answers the writer did not choose in front of the
              one they did. */}

          <div className="max-w-[700px] w-full mx-auto space-y-8 pb-20">

            {mode !== "discussion" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              </div>
            )}

            {mode === "article" && (
              <div className="animate-in fade-in duration-300">
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                {coverImage ? (
                  <div className="relative w-full h-48 sm:h-64 rounded-3xl overflow-hidden group cursor-pointer" onClick={() => coverInputRef.current?.click()}>
                    <Image src={coverImage} alt="" fill sizes="(max-width: 640px) 100vw, 700px" className="object-cover" />
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
              </div>
            )}

            {(mode === "showcase" || mode === "feedback") && (
              <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                {mode === "feedback" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Feedback Type</label>
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
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Figma / Prototype Link</label>
                    <input
                      type="text" placeholder="https://figma.com/..."
                      className="w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium outline-none focus:border-zinc-400 dark:focus:border-zinc-600 dark:text-white"
                      value={figmaLink} onChange={e => setFigmaLink(e.target.value)}
                    />
                  </div>
                )}
                {mode === "showcase" && (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tools Used (Comma separated)</label>
                    <input
                      type="text" placeholder="Figma, Spline, React..."
                      className="w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-medium outline-none focus:border-zinc-400 dark:focus:border-zinc-600 dark:text-white"
                      value={toolsUsed} onChange={e => setToolsUsed(e.target.value)}
                    />
                  </div>
                )}
              </div>
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

            {/* Topics, the extra-shots gallery and series selection used to
                follow the editor. All three are removed: the article surface
                is a cover, a title and the writing tools, and nothing else.
                The state behind them stays wired into autosave and publish, so
                a draft written before this still round-trips its tags, gallery
                and series instead of losing them on the next save. */}

          </div>
        </div>

        {/* The whole right column - draft checklist, word/read-time counters,
            writing tips - is hidden for an article. It was three panels of
            commentary beside the thing being written, and it is the bulk of
            what "nothing else on the page" was asking to lose. Kept for the
            other modes, whose forms are short enough that the column is not
            competing with the work. */}
        <div className={cn(
          "hidden flex-col w-[340px] shrink-0 border-l border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/10 p-8",
          mode !== "article" && "lg:flex"
        )}>

          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">Draft Status</h3>
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
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Words</div>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="text-2xl font-bold dark:text-white mb-1">{readTime}m</div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Read Time</div>
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
