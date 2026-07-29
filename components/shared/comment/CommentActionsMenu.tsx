"use client";

import { MoreHorizontal, Pencil, Pin, Trash2, Flag, RotateCcw, ShieldAlert } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CommentActionsMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  canRestore: boolean;
  canReport: boolean;
  canPin: boolean;
  isPinned: boolean;
  isAdminAction: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onReport: () => void;
  onTogglePin: () => void;
}

export function CommentActionsMenu({
  open,
  onOpenChange,
  canEdit,
  canDelete,
  canRestore,
  canReport,
  canPin,
  isPinned,
  isAdminAction,
  onEdit,
  onDelete,
  onRestore,
  onReport,
  onTogglePin,
}: CommentActionsMenuProps) {
  if (!canEdit && !canDelete && !canRestore && !canReport && !canPin) return null;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label="Comment actions"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl dark:border-zinc-800 dark:bg-zinc-900">
        {canPin && (
          <DropdownMenuItem onClick={onTogglePin} className="cursor-pointer dark:focus:bg-zinc-800 dark:focus:text-zinc-100">
            <Pin className="mr-2 h-4 w-4" />
            {isPinned ? "Unpin comment" : "Pin comment"}
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer dark:focus:bg-zinc-800 dark:focus:text-zinc-100">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canRestore && (
          <DropdownMenuItem onClick={onRestore} className="cursor-pointer dark:focus:bg-zinc-800 dark:focus:text-zinc-100">
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore comment
          </DropdownMenuItem>
        )}
        {canReport && (
          <DropdownMenuItem onClick={onReport} className="cursor-pointer dark:focus:bg-zinc-800 dark:focus:text-zinc-100">
            <Flag className="mr-2 h-4 w-4" />
            Report
          </DropdownMenuItem>
        )}
        {(canPin || canEdit || canReport) && canDelete && <DropdownMenuSeparator />}
        {canDelete && (
          <DropdownMenuItem onClick={onDelete} variant="destructive" className="cursor-pointer">
            {isAdminAction ? <ShieldAlert className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {isAdminAction ? "Remove comment" : "Delete"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
