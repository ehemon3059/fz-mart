"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Icon, type IconName } from "@/components/icons";

interface Props {
  defaultValue?: string;
  onChange: (html: string) => void;
}

function ToolbarButton({
  active,
  onClick,
  icon,
  text,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  icon?: IconName;
  text?: string;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={[
        "flex h-8 min-w-[2rem] items-center justify-center rounded-md px-1.5 text-[13px] font-bold transition",
        active
          ? "bg-stone-800 text-white"
          : "text-stone-600 hover:bg-white hover:text-stone-900 hover:shadow-sm",
      ].join(" ")}
    >
      {text ?? (icon ? <Icon name={icon} size={16} strokeWidth={2} /> : null)}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="sticky top-[61px] z-10 flex flex-wrap items-center gap-1 border-b border-stone-100 bg-stone-50/80 px-3 py-2 backdrop-blur">
      <ToolbarButton title="Bold (Ctrl+B)" icon="bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton title="Italic (Ctrl+I)" icon="italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <span className="mx-1 h-5 w-px bg-stone-200" />
      <ToolbarButton title="Heading 2" text="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton title="Heading 3" text="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <span className="mx-1 h-5 w-px bg-stone-200" />
      <ToolbarButton title="Bullet list" icon="ul" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton title="Numbered list" icon="ol" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <span className="mx-1 h-5 w-px bg-stone-200" />
      <ToolbarButton title="Insert link" icon="link" active={editor.isActive("link")} onClick={setLink} />
      <ToolbarButton title="Blockquote" icon="quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
    </div>
  );
}

export default function RichTextEditor({ defaultValue = "", onChange }: Props) {
  const editor = useEditor({
    // Avoid SSR hydration mismatch (Tiptap renders client-only).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "prose-editor min-h-[420px] px-6 py-6 text-[15px] leading-relaxed text-stone-700 outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="flex flex-col">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
