import { useState, useRef, useEffect } from "react";

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}

export function EditableCell({ value, onSave, placeholder = "" }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value.toUpperCase())}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="editable-cell px-3 py-2 text-sm w-full min-w-[100px]"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="px-3 py-2 text-sm cursor-pointer min-h-[36px] min-w-[100px] rounded-md hover:bg-muted/50 transition-colors"
    >
      {value || <span className="text-muted-foreground/50">{placeholder || "Clique para editar"}</span>}
    </div>
  );
}
