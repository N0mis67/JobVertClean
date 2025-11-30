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
        content: field.value ? JSON.parse(field.value) : "",
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && field.value && editor.getHTML() !== field.value) {
            editor.commands.setContent(JSON.parse(field.value));
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