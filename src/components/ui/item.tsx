import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const itemVariants = cva("flex min-w-0 items-center gap-3 rounded-lg text-sm transition-colors", {
  variants: {
    variant: {
      default: "bg-transparent",
      outline: "border border-border bg-card",
      muted: "bg-muted/60",
    },
    size: {
      default: "p-4",
      sm: "gap-2.5 p-3",
      xs: "gap-2 p-2",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

type ItemProps = React.ComponentProps<"div"> & VariantProps<typeof itemVariants>;
const Item = React.forwardRef<HTMLDivElement, ItemProps>(({ className, variant, size, ...props }, ref) => (
  <div ref={ref} data-slot="item" data-variant={variant ?? "default"} data-size={size ?? "default"} className={cn(itemVariants({ variant, size }), className)} {...props} />
));
Item.displayName = "Item";

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-group" className={cn("flex flex-col", className)} {...props} />;
}

function ItemSeparator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr data-slot="item-separator" className={cn("my-1 border-0 border-t border-border", className)} {...props} />;
}

type ItemMediaProps = React.ComponentProps<"div"> & { variant?: "default" | "icon" | "image" };
function ItemMedia({ variant = "default", className, ...props }: ItemMediaProps) {
  return <div data-slot="item-media" data-variant={variant} className={cn("flex shrink-0 items-center justify-center overflow-hidden", variant === "icon" && "size-9 rounded-md bg-muted text-muted-foreground [&_svg]:size-4", variant === "image" && "size-10 rounded-md [&_img]:size-full [&_img]:object-cover", className)} {...props} />;
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-content" className={cn("flex min-w-0 flex-1 flex-col gap-1", className)} {...props} />;
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-title" className={cn("truncate font-medium leading-none", className)} {...props} />;
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="item-description" className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-actions" className={cn("ml-auto flex shrink-0 items-center gap-2", className)} {...props} />;
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-header" className={cn("flex w-full items-center justify-between gap-2", className)} {...props} />;
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-footer" className={cn("w-full border-t border-border pt-3 text-sm", className)} {...props} />;
}

export { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle };
