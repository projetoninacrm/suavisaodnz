import * as React from "react";
import { cn } from "@/lib/utils";

type MessageAlign = "start" | "end";

function Message({ align = "start", className, ...props }: React.ComponentProps<"div"> & { align?: MessageAlign }) {
  return (
    <div data-slot="message" data-align={align} className={cn("flex w-full items-end gap-2 data-[align=end]:flex-row-reverse", className)} {...props} />
  );
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-avatar" className={cn("mb-5 shrink-0", className)} {...props} />;
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-content" className={cn("flex min-w-0 max-w-full flex-col gap-1", className)} {...props} />;
}

function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-header" className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)} {...props} />;
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-footer" className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)} {...props} />;
}

function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-group" className={cn("flex flex-col gap-3", className)} {...props} />;
}

export { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter, MessageGroup };
