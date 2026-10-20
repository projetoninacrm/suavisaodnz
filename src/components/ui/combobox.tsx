import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;
const ComboboxLabel = ComboboxPrimitive.Label;
const ComboboxValue = ComboboxPrimitive.Value;
const ComboboxInputGroup = ComboboxPrimitive.InputGroup;
const ComboboxItemIndicator = ComboboxPrimitive.ItemIndicator;
const ComboboxChips = ComboboxPrimitive.Chips;
const ComboboxChip = ComboboxPrimitive.Chip;
const ComboboxChipRemove = ComboboxPrimitive.ChipRemove;
const ComboboxRow = ComboboxPrimitive.Row;
const ComboboxCollection = ComboboxPrimitive.Collection;
const ComboboxGroup = ComboboxPrimitive.Group;
const ComboboxSeparator = ComboboxPrimitive.Separator;
const ComboboxClear = ComboboxPrimitive.Clear;

const ComboboxTrigger = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Trigger
    ref={ref}
    className={cn("inline-flex items-center justify-center", className)}
    {...props}
  />
));
ComboboxTrigger.displayName = "ComboboxTrigger";

const ComboboxInput = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Input>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Input
    ref={ref}
    className={cn(
      "flex h-9 w-full border-b border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
ComboboxInput.displayName = "ComboboxInput";

type ComboboxContentProps = React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Popup> & {
  side?: React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Positioner>["side"];
  align?: React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Positioner>["align"];
  sideOffset?: number;
};

const ComboboxContent = React.forwardRef<HTMLDivElement, ComboboxContentProps>(
  ({ className, side = "bottom", align = "start", sideOffset = 4, ...props }, ref) => (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <ComboboxPrimitive.Popup
          ref={ref}
          className={cn(
            "z-50 max-h-80 min-w-[var(--anchor-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none",
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
);
ComboboxContent.displayName = "ComboboxContent";

const ComboboxList = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.List>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.List
    ref={ref}
    className={cn("max-h-72 overflow-y-auto p-1", className)}
    {...props}
  />
));
ComboboxList.displayName = "ComboboxList";

const ComboboxEmpty = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Empty
    ref={ref}
    className={cn("px-3 py-6 text-center text-sm text-muted-foreground", className)}
    {...props}
  />
));
ComboboxEmpty.displayName = "ComboboxEmpty";

const ComboboxItem = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex min-h-9 w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
));
ComboboxItem.displayName = "ComboboxItem";

const ComboboxGroupLabel = React.forwardRef<
  React.ElementRef<typeof ComboboxPrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof ComboboxPrimitive.GroupLabel>
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.GroupLabel
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
));
ComboboxGroupLabel.displayName = "ComboboxGroupLabel";

export {
  Combobox,
  ComboboxLabel,
  ComboboxValue,
  ComboboxInputGroup,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxRow,
  ComboboxCollection,
  ComboboxClear,
};
