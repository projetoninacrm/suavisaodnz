import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInlineEditorFocus } from "@/hooks/useInlineEditorFocus";

interface ExpandableTextCellProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function ExpandableTextCell({ value, onSave, placeholder = "", disabled = false, ariaLabel }: ExpandableTextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const { triggerRef, restoreFocusOnClose } = useInlineEditorFocus(isEditing);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelEditRef = useRef(false);
  const accessibleLabel = ariaLabel || (placeholder ? `${placeholder}` : "Observação");

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
    if (disabled) {
      setEditValue(value);
      return;
    }
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      restoreFocusOnClose();
      textareaRef.current?.blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      restoreFocusOnClose();
      cancelEditRef.current = true;
      setEditValue(value);
      textareaRef.current?.blur();
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Textarea
        ref={textareaRef}
        aria-label={accessibleLabel}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        className="editable-cell h-auto min-h-9 px-3 py-2 text-sm w-full min-w-[100px] resize-none overflow-hidden leading-snug"
        placeholder={placeholder}
      />
    );
  }

  return (
    <Button
      ref={triggerRef}
      variant="ghost"
      size="sm"
      type="button"
      disabled={disabled}
      onClick={() => setIsEditing(true)}
      aria-label={accessibleLabel}
      className="h-auto min-h-[36px] w-full min-w-[100px] justify-start whitespace-pre-wrap rounded-md px-3 py-2 text-left text-sm leading-snug transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {value || <span className="text-muted-foreground">-</span>}
    </Button>
  );
}
