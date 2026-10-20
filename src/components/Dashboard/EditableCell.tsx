import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInlineEditorFocus } from "@/hooks/useInlineEditorFocus";

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function EditableCell({ value, onSave, placeholder = "", ariaLabel }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const { triggerRef, restoreFocusOnClose } = useInlineEditorFocus(isEditing);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);
  const accessibleLabel = ariaLabel || (placeholder ? `Editar ${placeholder}` : "Editar valor");

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      restoreFocusOnClose();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      restoreFocusOnClose();
      cancelEditRef.current = true;
      setEditValue(value);
      inputRef.current?.blur();
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="text"
        aria-label={accessibleLabel}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="editable-cell h-9 min-h-9 px-3 py-2 text-sm w-full min-w-[100px]"
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
      onClick={() => setIsEditing(true)}
      aria-label={accessibleLabel}
      className="h-auto min-h-[36px] w-full min-w-[100px] justify-start whitespace-normal rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {value || <span className="text-muted-foreground">-</span>}
    </Button>
  );
}
