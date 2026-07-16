import { useState, useRef, useEffect } from "react";

interface ExpandableTextCellProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}

export function ExpandableTextCell({ value, onSave, placeholder = "" }: ExpandableTextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) autoResize();
  }, [editValue, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={1}
        className="editable-cell px-3 py-2 text-sm w-full min-w-[100px] resize-none overflow-hidden leading-snug"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="px-3 py-2 text-sm cursor-pointer min-h-[36px] min-w-[100px] rounded-md hover:bg-muted/50 transition-colors whitespace-pre-wrap break-words leading-snug"
    >
      {value || <span className="text-muted-foreground">-</span>}
    </div>
  );
}