import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const InputGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="input-group"
    className={cn("flex min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-sm transition-colors focus-within:border-ring focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}
    {...props}
  />
));
InputGroup.displayName = "InputGroup";

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    data-slot="input-group-control"
    className={cn("h-10 min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...props}
  />
));
InputGroupInput.displayName = "InputGroupInput";

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    data-slot="input-group-control"
    className={cn("min-h-20 min-w-0 flex-1 resize-y border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...props}
  />
));
InputGroupTextarea.displayName = "InputGroupTextarea";

const inputGroupAddonVariants = cva("flex shrink-0 items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4", {
  variants: {
    align: {
      "inline-start": "order-first",
      "inline-end": "order-last",
      "block-start": "order-first w-full pt-2",
      "block-end": "order-last w-full pb-2",
    },
  },
  defaultVariants: { align: "inline-start" },
});

type InputGroupAddonProps = React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>;
const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(({ align, className, ...props }, ref) => (
  <div ref={ref} data-slot="input-group-addon" data-align={align ?? "inline-start"} className={cn(inputGroupAddonVariants({ align }), className)} {...props} />
));
InputGroupAddon.displayName = "InputGroupAddon";

const inputGroupButtonVariants = cva("inline-flex shrink-0 items-center justify-center gap-1 rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      xs: "h-7 px-2 text-xs",
      "icon-xs": "size-7 [&_svg]:size-3.5",
      sm: "h-8 px-2.5 text-xs",
      "icon-sm": "size-8 [&_svg]:size-4",
    },
  },
  defaultVariants: { variant: "ghost", size: "xs" },
});

type InputGroupButtonProps = React.ComponentProps<"button"> & VariantProps<typeof inputGroupButtonVariants>;
const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(({ className, variant, size, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} data-slot="input-group-button" className={cn(inputGroupButtonVariants({ variant, size }), className)} {...props} />
));
InputGroupButton.displayName = "InputGroupButton";

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="input-group-text" className={cn("shrink-0 text-sm text-muted-foreground", className)} {...props} />;
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea };
