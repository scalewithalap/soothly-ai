"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useState } from "react";
import {
  $getSelection,
  $isRangeSelection,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_LOW,
  TextNode,
  $getRoot,
} from "lexical";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createListNode } from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { toast } from "sonner";

import {
  Sparkles,
  Heading1,
  Heading2,
  List,
  Quote,
  Loader2,
} from "lucide-react";

export function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isGenerating, setIsGenerating] = useState(false);

  // Simple trigger detection
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setIsOpen(false);
          return;
        }

        const anchor = selection.anchor;
        const node = anchor.getNode();

        if (node instanceof TextNode) {
          // Trigger detection handled by KEY_DOWN_COMMAND
        }
      });
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (event.key === "/") {
          setTimeout(() => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              setPosition({ top: rect.bottom + 5, left: rect.left });
              setIsOpen(true);
            }
          }, 10);
          return false;
        }
        if (event.key === "Escape") {
          setIsOpen(false);
          return false;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  // Close when clicking outside
  useEffect(() => {
    const handleClick = () => setIsOpen(false);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const executeCommand = async (type: string) => {
    if (type === "ai_write") {
      setIsOpen(false);
      setIsGenerating(true);

      // Get current content for context
      let currentContent = "";
      editor.getEditorState().read(() => {
        currentContent = $getRoot().getTextContent();
      });

      try {
        const response = await fetch("/api/agents/seo/generate-inline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction:
              "Continue writing this article with the next logical paragraph. Be SEO-friendly and engaging.",
            context: currentContent,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate content");
        }

        const data = await response.json();
        const generatedText = data.data?.content || "";

        // Insert into editor
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText("\n\n" + generatedText);
          }
        });

        toast.success("Content generated successfully");
      } catch (error) {
        console.error("AI generation error:", error);
        toast.error("Failed to generate content");
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Non-AI commands (formatting)
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (type === "h1") {
          $setBlocksType(selection, () => $createHeadingNode("h1"));
        } else if (type === "h2") {
          $setBlocksType(selection, () => $createHeadingNode("h2"));
        } else if (type === "bullet") {
          $setBlocksType(selection, () => $createListNode("bullet"));
        } else if (type === "quote") {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      }
    });
    setIsOpen(false);
  };

  if (!isOpen && !isGenerating) return null;

  // Show loading indicator during generation
  if (isGenerating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-lg px-6 py-4 shadow-2xl">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-sm text-gray-200">Generating content...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-64 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col pt-1"
    >
      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
        AI Commands
      </div>
      <MenuItem
        icon={<Sparkles className="w-4 h-4 text-purple-400" />}
        label="AI Write"
        subLabel="Generate text based on context"
        onClick={() => executeCommand("ai_write")}
      />

      <div className="my-1 border-t border-white/5" />

      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
        Format
      </div>
      <MenuItem
        icon={<Heading1 className="w-4 h-4" />}
        label="Heading 1"
        onClick={() => executeCommand("h1")}
      />
      <MenuItem
        icon={<Heading2 className="w-4 h-4" />}
        label="Heading 2"
        onClick={() => executeCommand("h2")}
      />
      <MenuItem
        icon={<List className="w-4 h-4" />}
        label="Bullet List"
        onClick={() => executeCommand("bullet")}
      />
      <MenuItem
        icon={<Quote className="w-4 h-4" />}
        label="Quote"
        onClick={() => executeCommand("quote")}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  subLabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-white/10 transition-colors group"
    >
      <div className="p-1 rounded bg-white/5 group-hover:bg-white/10 text-gray-300">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-200">{label}</div>
        {subLabel && <div className="text-xs text-gray-500">{subLabel}</div>}
      </div>
    </button>
  );
}
