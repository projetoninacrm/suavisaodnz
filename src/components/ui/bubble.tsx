import * as React from "react";
import { cn } from "@/lib/utils";

type BubbleVariant = "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
type BubbleAlign = "start" | "end";

const bubbleVariants: Record<BubbleVariant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-muted-foreground",
  tinted: "bg-primary/10 text-foreground",
  outline: "border bg-background text-foreground",
  ghost: "bg-transparent text-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

function Bubble({ align = "start", variant = "default", className, ...props }: React.ComponentProps<"div"> & { align?: BubbleAlign; variant?: BubbleVariant }) {
  return (
    <div
      data-slot="bubble"
      data-align={align}
      data-variant={variant}
      className={cn("flex w-fit max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed", "data-[align=start]:self-start data-[align=end]:self-end", bubbleVariants[variant], className)}
      {...props}
    />
  );
}

function BubbleContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="bubble-content" className={cn("min-w-0 break-words", className)} {...props} />;
}

function BubbleReactions({ align = "end", side = "bottom", className, ...props }: React.ComponentProps<"div"> & { align?: BubbleAlign; side?: "top" | "bottom" }) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn("-mt-1 flex w-fit items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs", "data-[align=start]:self-start data-[align=end]:self-end", className)}
      {...props}
    />
  );
}

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="bubble-group" className={cn("flex flex-col gap-2", className)} {...props} />;
}

export { Bubble, BubbleContent, BubbleReactions, BubbleGroup };
