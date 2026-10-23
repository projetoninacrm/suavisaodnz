import { useState, useRef, useEffect, useId } from "react";

interface ComboEditableCellProps {
  value: string;
  onSave: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function ComboEditableCell({ value, onSave, suggestions = [], placeholder = "" }: ComboEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    if (editValue !== value) onSave(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const uniqueSuggestions = Array.from(new Set(suggestions.filter(Boolean)));

  if (isEditing) {
    return (
      <>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          list={listId}
          className="editable-cell px-3 py-2 text-sm w-full min-w-[100px]"
          placeholder={placeholder}
        />
        <datalist id={listId}>
          {uniqueSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="px-3 py-2 text-sm cursor-pointer min-h-[36px] min-w-[100px] rounded-md hover:bg-muted/50 transition-colors"
    >
      {value || <span className="text-muted-foreground">{placeholder || "-"}</span>}
    </div>
  );
}