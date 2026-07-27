import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 py-2 border-y border-zinc-100 dark:border-zinc-800">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("bold") ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("italic") ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("strike") ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("code") ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <Code className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-2" />

      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("heading", { level: 1 }) ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("heading", { level: 2 }) ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("heading", { level: 3 }) ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-2" />

      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("bulletList") ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("orderedList") ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`h-8 w-8 rounded-md ${editor.isActive("blockquote") ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="h-8 w-8 rounded-md text-zinc-500"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="h-8 w-8 rounded-md text-zinc-500"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}
