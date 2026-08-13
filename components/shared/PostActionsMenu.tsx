"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostActionsMenuProps {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

// The post-level counterpart to CommentActionsMenu, deliberately built to the
// same shape so the two read as one interaction rather than two conventions.
// Renders nothing at all when the viewer owns neither action, so a passer-by
// never sees a menu button that opens an empty menu.
export function PostActionsMenu({ canEdit, canDelete, onEdit, onDelete }: PostActionsMenuProps) {
  if (!canEdit && !canDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Post actions"
        // stopPropagation because the whole card is a click target that
        // navigates to the post - without it, opening the menu would also
        // push you into the detail view underneath it.
        onClick={(e) => e.stopPropagation()}
        className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        className="w-44 rounded-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        {canEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer dark:focus:bg-zinc-800 dark:focus:text-zinc-100">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canEdit && canDelete && <DropdownMenuSeparator />}
        {canDelete && (
          <DropdownMenuItem onClick={onDelete} variant="destructive" className="cursor-pointer">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete permanently
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
