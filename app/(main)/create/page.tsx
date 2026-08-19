"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Users, Lock, Check, Loader2, PenTool, UploadCloud } from "lucide-react";
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
  }, [title, content, mode, selectedTopics, toolsUsed, portfolioLink, feedbackType, urgency, figmaLink, coverImage, postImages, galleryImages, seriesId]);

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
        router.push(result.resultType === "article" ? articleUrl(result) : postUrl(result));
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

        {/* Hidden while writing an article, which is the surface that is meant
            to be title + cover + tools and nothing else. Articles publish
            public, which is the value this control already defaulted to.
            Other modes keep it - a showcase or a feedback request is exactly
            the kind of thing someone wants to limit to followers. */}
        {mode === "article" ? (
          <span aria-hidden />
        ) : (
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
