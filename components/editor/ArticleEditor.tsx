"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorToolbar } from "./EditorToolbar";
import { useEffect } from "react";

interface ArticleEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function ArticleEditor({ content, onChange }: ArticleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 
          "prose prose-zinc dark:prose-invert prose-lg max-w-none focus:outline-none min-h-[400px] pb-16",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Keep editor content in sync if it changes externally (optional, but good practice)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col border-y border-zinc-100 dark:border-zinc-800">
      <EditorToolbar editor={editor} />
      <div className="mt-4 px-4 sm:px-0">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
