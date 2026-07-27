"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MoreHorizontal, Pin } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore, PostComment } from "@/store/useDataStore";
import { cn } from "@/lib/utils";
import { CommentInput } from "./CommentInput";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CommentItemProps {
  comment: PostComment;
  postAuthorId: string;
  replies?: PostComment[];
}

export function CommentItem({ comment, postAuthorId, replies = [] }: CommentItemProps) {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { likedComments, toggleCommentLike, togglePinComment, addReply } = useDataStore();
  
  const [isReplying, setIsReplying] = useState(false);

  const isLiked = likedComments.includes(comment.id);
  const isPostAuthor = user?.id === postAuthorId;
  const isCommentAuthor = user?.id === comment.author.id;

  const handleInteraction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (action) action();
  };

  const handleReplySubmit = (content: string) => {
    if (user) {
      addReply(comment.postId, comment.id, content, user);
      setIsReplying(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Pinned Badge */}
      {comment.isPinned && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold px-4 pt-3 pb-1 ml-12">
          <Pin className="w-3.5 h-3.5" />
          Pinned by author
        </div>
      )}
      
      <div className={cn("flex gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors", comment.isPinned ? "pt-2" : "")}>
        <Avatar className="w-10 h-10 border border-zinc-100 dark:border-zinc-800 shrink-0 mt-1">
          <AvatarImage src={comment.author.avatar} />
          <AvatarFallback className="dark:bg-zinc-800 dark:text-zinc-300">{comment.author.name.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-[15px] dark:text-zinc-100">{comment.author.name}</span>
              {comment.author.id === postAuthorId && (
                <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full ml-1">Author</span>
              )}
              <span className="text-sm text-zinc-500 truncate">@{comment.author.username}</span>
              <span className="text-sm text-zinc-500 ml-1">· {comment.timestamp}</span>
            </div>
            
            {/* Options Menu (Pinning) */}
            {isPostAuthor && !comment.parentId && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full outline-none transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl dark:bg-zinc-900 dark:border-zinc-800">
                  <DropdownMenuItem onClick={() => togglePinComment(comment.postId, comment.id)} className="cursor-pointer dark:focus:bg-zinc-800 dark:focus:text-zinc-100">
                    <Pin className="w-4 h-4 mr-2" />
                    {comment.isPinned ? "Unpin comment" : "Pin comment"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <p className="text-[15px] leading-normal text-zinc-900 dark:text-zinc-200 mb-2">
            {comment.content}
          </p>

          <div className="flex items-center gap-6 mt-1">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <button 
                onClick={(e) => handleInteraction(e, () => toggleCommentLike(comment.id, isPostAuthor))} 
                className={cn("flex items-center gap-1.5 group transition-colors", isLiked ? "text-pink-600 dark:text-pink-500" : "hover:text-pink-500 dark:hover:text-pink-400")}
              >
                <div className={cn("p-1.5 rounded-full transition-colors -ml-1.5", isLiked ? "bg-pink-50/50 dark:bg-pink-500/10" : "group-hover:bg-pink-50 dark:group-hover:bg-pink-500/10")}>
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                </div>
                <span className="text-xs font-medium">{comment.likes}</span>
              </button>
            </div>
            <button 
              onClick={(e) => handleInteraction(e, () => setIsReplying(!isReplying))} 
              className="flex items-center gap-1.5 text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 group transition-colors"
            >
              <div className="p-1.5 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors -ml-1.5">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium">Reply</span>
            </button>

            {/* Creator Liked Badge */}
            {comment.likedByCreator && (
              <div className="flex items-center ml-auto">
                 <div className="relative flex items-center group cursor-pointer">
                    <Avatar className="w-6 h-6 border-2 border-white shadow-sm z-10">
                      <AvatarImage src="https://i.pravatar.cc/150?u=1" /> {/* Fallback to mock post author avatar for simplicity, ideally passed in */}
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 z-20 bg-white rounded-full p-[2px] shadow-sm">
                       <Heart className="w-2.5 h-2.5 fill-pink-500 text-pink-500" />
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white text-[10px] font-semibold py-1 px-2 rounded-md -top-7 right-0 whitespace-nowrap pointer-events-none">
                      Liked by author
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isReplying && (
        <div className="pl-12 sm:pl-16 pr-4 border-l-2 border-zinc-100 dark:border-zinc-800 ml-6 sm:ml-9">
          <CommentInput onSubmit={handleReplySubmit} placeholder="Post your reply" autoFocus />
        </div>
      )}

      {/* Render Replies */}
      {replies.length > 0 && (
        <div className="pl-6 sm:pl-9 ml-6 sm:ml-9 border-l-2 border-zinc-100 dark:border-zinc-800 relative">
          <div className="absolute -bottom-4 -left-0.5 w-1 h-6 bg-white dark:bg-zinc-950" /> {/* Hides bottom border tail */}
          {replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} postAuthorId={postAuthorId} />
          ))}
        </div>
      )}
    </div>
  );
}
