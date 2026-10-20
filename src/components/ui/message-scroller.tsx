import * as React from "react";
import { cn } from "@/lib/utils";

function MessageScroller({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-scroller" className={cn("flex min-h-0 flex-col", className)} {...props} />;
}

function MessageScrollerViewport({ className, "aria-label": ariaLabel = "Mensagens", ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-scroller-viewport"
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn("min-h-0 overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  );
}

function MessageScrollerContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-scroller-content" role="log" aria-relevant="additions" className={cn("flex flex-col gap-4", className)} {...props} />;
}

function MessageScrollerItem({ messageId, scrollAnchor = false, className, ...props }: React.ComponentProps<"div"> & { messageId?: string; scrollAnchor?: boolean }) {
  return (
    <div
      data-slot="message-scroller-item"
      data-message-id={messageId}
      data-scroll-anchor={scrollAnchor ? "true" : undefined}
      className={cn("w-full", className)}
      {...props}
    />
  );
}

export { MessageScroller, MessageScrollerViewport, MessageScrollerContent, MessageScrollerItem };
