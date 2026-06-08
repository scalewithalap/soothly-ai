import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SELECTION_CHANGE_COMMAND,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import { Bold, Italic, Underline, Code } from "lucide-react";

export function FloatingToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isText, setIsText] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const nativeSelection = window.getSelection();
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        !nativeSelection.isCollapsed &&
        rootElement !== null &&
        rootElement.contains(nativeSelection.anchorNode)
      ) {
        const domRange = nativeSelection.getRangeAt(0);
        const rect = domRange.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
          // Calculate position relative to viewport
          setPosition({
            top: rect.top - 50, // Above the selection with some padding
            left: rect.left + rect.width / 2, // Centered
          });
          setIsText(true);
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));
          setIsCode(selection.hasFormat("code"));
          return;
        }
      }
    }
    setIsText(false);
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        1,
      ),
    );
  }, [editor, updateToolbar]);

  if (!isText) return null;

  return (
    <div
      ref={toolbarRef}
      style={{
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
      }}
      className="fixed z-50 flex items-center p-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl shadow-black/50 animate-in fade-in zoom-in duration-200 gap-1"
    >
      <ToolbarButton
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        }}
        isActive={isBold}
        icon={<Bold className="w-4 h-4" />}
      />
      <ToolbarButton
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        }}
        isActive={isItalic}
        icon={<Italic className="w-4 h-4" />}
      />
      <ToolbarButton
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
        }}
        isActive={isUnderline}
        icon={<Underline className="w-4 h-4" />}
      />
      <ToolbarButton
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
        }}
        isActive={isCode}
        icon={<Code className="w-4 h-4" />}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  icon,
}: {
  onClick: () => void;
  isActive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        isActive
          ? "bg-white/20 text-white"
          : "text-gray-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
    </button>
  );
}
