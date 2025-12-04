"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function JsonToHtml({ json }: { json: JSONContent }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl   dark:prose-invert",
      },
    },

    content: json,
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} />;
}