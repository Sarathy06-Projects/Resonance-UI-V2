"use client";

import useSWR from "swr";
import { PenSquare, Image as ImageIcon, Clock, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteDraft, getDrafts } from "@/lib/api/drafts";
import { timeAgo } from "@/lib/formatTime";

export default function DraftsPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR("drafts", getDrafts);
  const drafts = data?.drafts ?? [];

  const handleDelete = async (id: string) => {
    await deleteDraft(id);
    mutate();
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 md:px-6 min-h-[80vh]">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white mb-2">Drafts</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[17px]">Continue writing where you left off.</p>
        </div>
        <Button onClick={() => router.push("/create")} className="rounded-full h-10 px-6 font-medium shadow-sm hidden sm:flex">
          New Article
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-zinc-400">Loading…</div>
      ) : drafts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {drafts.map(draft => (
            <div key={draft.id} className="group flex flex-col bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300">

              <div className={`w-full h-40 flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800/50 ${draft.coverImage ? "" : "bg-zinc-50 dark:bg-zinc-900"}`}>
                {draft.coverImage ? (
                  <img src={draft.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {draft.status}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="capitalize">{draft.mode}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-4 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {draft.title || "Untitled draft"}
                </h3>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Edited {timeAgo(draft.updatedAt)}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 rounded-full font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4" onClick={() => router.push(`/create?draftId=${draft.id}`)}>
                      Continue Editing
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full dark:hover:bg-zinc-800">
                          <MoreVertical className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="w-40 rounded-xl dark:bg-zinc-900 dark:border-zinc-800">
                        <DropdownMenuItem onClick={() => handleDelete(draft.id)} className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 rounded-lg py-2">
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Draft</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No drafts available"
          subtitle="Start writing an article and it will appear here."
          onAction={() => router.push("/create")}
          actionLabel="Write Article"
        />
      )}
    </div>
  );
}

function EmptyState({ title, subtitle, onAction, actionLabel }: { title: string, subtitle: string, onAction: () => void, actionLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-[32px] border border-dashed border-zinc-200 dark:border-zinc-800">
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
        <PenSquare className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">{title}</h3>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8 leading-relaxed">{subtitle}</p>
      <Button onClick={onAction} className="rounded-full px-8 shadow-sm h-11 font-medium">
        {actionLabel}
      </Button>
    </div>
  );
}
