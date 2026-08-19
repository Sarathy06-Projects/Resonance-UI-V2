"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
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
      Image.configure({
        HTMLAttributes: { class: "rounded-2xl w-full" },
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
    // No border on this wrapper: the toolbar is sticky and owns the rules
    // above and below itself. A border here would stay behind when the bar
    // detaches and scrolls away, leaving a stray line across the page where
    // the toolbar used to be.
    <div className="flex flex-col">
      <EditorToolbar editor={editor} />
      <div className="mt-4 px-4 sm:px-0">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
