import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const codeBlockVariants = cva(
  "group/code-block relative flex w-full min-w-0 flex-col overflow-hidden rounded-lg text-sm",
  {
    variants: {
      variant: {
        default: "border border-input bg-muted/30 text-foreground",
        destructive: "border border-destructive/40 bg-destructive/5 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function CodeBlock({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof codeBlockVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="code-block"
      data-variant={variant}
      data-size={size}
      className={cn(codeBlockVariants({ variant }), className)}
      {...props}
    />
  );
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-header"
      className={cn("flex min-w-0 items-center gap-2 border-b px-3 py-2.5", className)}
      {...props}
    />
  );
}

function CodeBlockTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-title"
      className={cn("min-w-0 truncate text-sm font-medium", className)}
      {...props}
    />
  );
}

function CodeBlockActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-actions"
      className={cn("ml-auto flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Use the document copy command when clipboard permissions are unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

function CodeBlockCopyButton({
  value,
  variant = "ghost",
  size = "icon",
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & { value: string }) {
  const [status, setStatus] = React.useState<"idle" | "copied" | "error">("idle");

  React.useEffect(() => {
    if (status === "idle") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 2500);
    return () => window.clearTimeout(timeout);
  }, [status]);

  return (
    <>
      <Button
        data-slot="code-block-copy-button"
        data-copied={status === "copied" || undefined}
        type="button"
        variant={variant}
        size={size}
        aria-label={status === "copied" ? "Código copiado" : "Copiar código"}
        className={cn("h-8 w-8", className)}
        onClick={async (event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          try {
            setStatus((await copyText(value)) ? "copied" : "error");
          } catch {
            setStatus("error");
          }
        }}
        {...props}
      >
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
      <span
        role="status"
        aria-live="polite"
        className={cn("text-xs", status === "error" ? "text-destructive" : "sr-only")}
      >
        {status === "copied" ? "Código copiado." : status === "error" ? "Não foi possível copiar. Selecione o texto e use Ctrl+C ou ⌘C." : ""}
      </span>
    </>
  );
}

function CodeBlockContent({
  className,
  children,
  style,
  wrap = false,
  lineNumbers = false,
  startLine = 1,
  ...props
}: React.ComponentProps<"pre"> & {
  wrap?: boolean;
  lineNumbers?: boolean;
  startLine?: number;
}) {
  const lines = typeof children === "string" ? children.replace(/\n$/, "").split("\n") : null;

  return (
    <pre
      data-slot="code-block-content"
      data-wrap={wrap || undefined}
      data-numbered={lineNumbers || undefined}
      dir="ltr"
      tabIndex={0}
      style={style}
      className={cn(
        "m-0 min-w-0 overflow-auto px-4 py-3 text-left font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        className
      )}
      {...props}
    >
      <code data-slot="code-block-code" className="block min-w-max">
        {lineNumbers && lines
          ? lines.map((line, index) => (
              <CodeBlockLine key={index} number={startLine + index}>{line || " "}</CodeBlockLine>
            ))
          : children}
      </code>
    </pre>
  );
}

const codeBlockLineVariants = cva("block min-h-5", {
  variants: {
    variant: {
      default: "",
      added: "bg-success/10",
      removed: "bg-destructive/10",
      highlighted: "bg-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

function CodeBlockLine({
  className,
  variant = "default",
  number,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof codeBlockLineVariants> & { number?: number }) {
  return (
    <span
      data-slot="code-block-line"
      data-variant={variant}
      className={cn(codeBlockLineVariants({ variant }), className)}
      {...props}
    >
      {number !== undefined ? (
        <span aria-hidden="true" className="mr-4 inline-block min-w-5 select-none text-right text-muted-foreground">{number}</span>
      ) : null}
      <span data-slot="code-block-line-content">{children}</span>
    </span>
  );
}

function CodeBlockFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-footer"
      className={cn("flex min-w-0 items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
  CodeBlockFooter,
};
