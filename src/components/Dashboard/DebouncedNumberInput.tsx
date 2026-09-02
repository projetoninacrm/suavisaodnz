import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface DebouncedNumberInputProps {
  value: number | null | undefined;
  onCommit: (value: number | null) => void;
  className?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  delay?: number;
}

/**
 * Input numérico com estado local: a digitação é instantânea e o salvamento
 * (async) acontece com debounce, evitando que o valor "volte" enquanto digita.
 */
export function DebouncedNumberInput({
  value,
  onCommit,
  className,
  placeholder,
  step = "1",
  min = "0",
  delay = 500,
}: DebouncedNumberInputProps) {
  const externalValue = value !== null && value !== undefined ? String(value) : "";
  const [text, setText] = useState(externalValue);
  const isEditing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Sincroniza com o valor externo apenas quando o usuário não está digitando
  useEffect(() => {
    if (!isEditing.current) setText(externalValue);
  }, [externalValue]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (raw: string) => {
    isEditing.current = true;
    setText(raw);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const parsed = raw === "" ? null : parseInt(raw, 10);
      onCommit(Number.isNaN(parsed as number) ? null : parsed);
    }, delay);
  };

  const flush = () => {
    clearTimeout(timer.current);
    isEditing.current = false;
    const parsed = text === "" ? null : parseInt(text, 10);
    onCommit(Number.isNaN(parsed as number) ? null : parsed);
  };

  return (
    <Input
      type="number"
      step={step}
      min={min}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={flush}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          flush();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
      placeholder={placeholder}
    />
  );
}
