"use client"

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import { MenuBar } from "./MenuBar";

type EditorField = {
    value: string;
    onChange: (value: string) => void;
};

interface JobDescriptionEditorProps {
    field: EditorField;
}

function parseEditorContent(value: string) {
    if (!value) {
        return "";
    }

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

export default function JobDescriptionEditor({
    field,
}: JobDescriptionEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
            }),
        ],
        editorProps: {
            attributes: {
                class:
                  "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[300px] p-4 max-w-none dark:prose-invert",
            },
        },
        onUpdate: ({ editor }) => {
            field.onChange(JSON.stringify(editor.getJSON()));
        },
        content: parseEditorContent(field.value),
        immediatelyRender: false,
    });

    useEffect(() => {
        if (!editor || !field.value) {
            return;
        }

        const nextContent = parseEditorContent(field.value);
        const currentContent = JSON.stringify(editor.getJSON());

        if (typeof nextContent !== "string" && currentContent !== field.value) {
            editor.commands.setContent(nextContent, false);
        }
    }, [editor, field.value]);

    return (
        <div className="w-full">
            <div className="border rounded-lg overflow-hidden bg-card">
                <MenuBar editor={editor}/>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
