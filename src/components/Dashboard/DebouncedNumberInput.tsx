import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DebouncedNumberInputProps {
  id?: string;
  value: number | null | undefined;
  onCommit: (value: number | null) => void | boolean | Promise<void | boolean>;
  className?: string;
  placeholder?: string;
  ariaLabel: string;
  step?: string;
  min?: string;
  delay?: number;
}

/**
 * Input numérico com estado local: a digitação é instantânea e o salvamento
 * (async) acontece com debounce, evitando que o valor "volte" enquanto digita.
 */
export function DebouncedNumberInput({
  id,
  value,
  onCommit,
  className,
  placeholder,
  ariaLabel,
  step = "1",
  min = "0",
  delay = 500,
}: DebouncedNumberInputProps) {
  const externalValue = value !== null && value !== undefined ? String(value) : "";
  const errorId = useId();
  const [text, setText] = useState(externalValue);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = useRef(false);
  const isSavingRef = useRef(false);
  const lastFailedText = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Sincroniza com o valor externo apenas quando o usuário não está digitando
  useEffect(() => {
    if (!isDirty.current) setText(externalValue);
  }, [externalValue]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = async (raw: string, retry = false) => {
    if (isSavingRef.current || (!isDirty.current && raw === externalValue)) return;
    if (!retry && lastFailedText.current === raw) return;

    isSavingRef.current = true;
    setIsSaving(true);
    const parsed = raw === "" ? null : parseInt(raw, 10);
    try {
      const saved = await onCommit(Number.isNaN(parsed as number) ? null : parsed);
      if (saved === false) throw new Error("save-failed");
      isDirty.current = false;
      lastFailedText.current = null;
      setText(raw);
      setSaveError(null);
    } catch {
      isDirty.current = true;
      lastFailedText.current = raw;
      setSaveError("Não foi possível salvar. O valor digitado foi mantido.");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleChange = (raw: string) => {
    if (isSavingRef.current) return;
    isDirty.current = true;
    lastFailedText.current = null;
    setSaveError(null);
    setText(raw);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void commit(raw); }, delay);
  };

  const flush = () => {
    clearTimeout(timer.current);
    void commit(text);
  };

  return (
    <div className="space-y-1" aria-busy={isSaving}>
      <Input
        id={id}
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
        aria-label={ariaLabel}
        aria-describedby={saveError ? errorId : undefined}
        disabled={isSaving}
      />
      {isSaving && <p role="status" className="text-xs text-muted-foreground">Salvando…</p>}
      {saveError && (
        <div id={errorId} role="alert" className="flex min-w-40 flex-col items-start gap-1 text-xs text-destructive">
          <span>{saveError}</span>
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => void commit(text, true)}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
