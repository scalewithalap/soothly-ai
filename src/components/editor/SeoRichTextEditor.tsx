"use client";

import { useEffect } from "react";
import { $getRoot } from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS, $convertFromMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";

// Custom Plugins
import { FloatingToolbarPlugin } from "@/components/editor/plugins/FloatingToolbarPlugin";
import { SlashCommandPlugin } from "@/components/editor/plugins/SlashCommandPlugin";

// Theme configuration
const theme = {
  paragraph: "mb-3 text-gray-300 leading-relaxed",
  heading: {
    h1: "text-3xl font-bold text-white mb-4 mt-6",
    h2: "text-2xl font-semibold text-white mb-3 mt-5",
    h3: "text-xl font-medium text-white mb-2 mt-4",
  },
  text: {
    bold: "font-bold text-white",
    italic: "italic",
    underline: "underline",
    code: "font-mono bg-white/10 p-1 rounded text-sm text-pink-400",
  },
  list: {
    ul: "list-disc list-inside mb-4 ml-4",
    ol: "list-decimal list-inside mb-4 ml-4",
  },
  quote:
    "border-l-4 border-white/20 pl-4 py-1 my-4 italic text-gray-400 bg-white/5 rounded-r",
  flag: "text-red-500", // For grammar issues
};

// Error Boundary
function onError(error: Error) {
  console.error(error);
}

export function SeoRichTextEditor({
  initialContent,
}: {
  initialContent?: string;
}) {
  const initialConfig = {
    namespace: "SeoEditor",
    theme,
    onError,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode],
  };

  return (
    <div className="flex flex-col h-full bg-[#111] relative rounded-lg border border-white/5">
      <LexicalComposer initialConfig={initialConfig}>
        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-full outline-none focus:outline-none" />
            }
            placeholder={
              <div className="text-gray-600 absolute top-[35px] pointer-events-none select-none">
                Start writing or press '/' for AI...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

          {/* Custom Interactive Plugins */}
          <FloatingToolbarPlugin />
          <SlashCommandPlugin />
          <InitialPlugin content={initialContent} />
        </div>
      </LexicalComposer>
    </div>
  );
}

function InitialPlugin({ content }: { content?: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (content) {
      editor.update(() => {
        const root = $getRoot();
        if (root.getTextContent() === "") {
          $convertFromMarkdownString(content, TRANSFORMERS, undefined, true); // preserveNewlines = true
        }
      });
    }
  }, [content, editor]);

  return null;
}
