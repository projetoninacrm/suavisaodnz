import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectOptionValue = string | number;
type SelectProps<Value extends SelectOptionValue = string> = Omit<
  SelectPrimitive.Root.Props<Value, false>,
  "items" | "onValueChange"
> & {
  items?: SelectPrimitive.Root.Props<NoInfer<Value>, false>["items"];
  onValueChange?: (value: NoInfer<Value>) => void;
};

type PositionerProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Positioner>;
type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Popup> &
  Pick<PositionerProps, "align" | "alignItemWithTrigger" | "collisionPadding" | "side" | "sideOffset">;

const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon>
      <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpArrow>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpArrow>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.ScrollUpArrow
    ref={ref}
    className={cn("flex shrink-0 cursor-default items-center justify-center py-1 text-muted-foreground", className)}
    {...props}
  >
    {children ?? <ChevronUp className="h-4 w-4" aria-hidden="true" />}
  </SelectPrimitive.ScrollUpArrow>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownArrow>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownArrow>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.ScrollDownArrow
    ref={ref}
    className={cn("flex shrink-0 cursor-default items-center justify-center py-1 text-muted-foreground", className)}
    {...props}
  >
    {children ?? <ChevronDown className="h-4 w-4" aria-hidden="true" />}
  </SelectPrimitive.ScrollDownArrow>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Popup>,
  SelectContentProps
>(
  (
    {
      className,
      children,
      align = "start",
      alignItemWithTrigger = false,
      side = "bottom",
      sideOffset = 4,
      collisionPadding = 8,
      ...props
    },
    ref,
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        alignItemWithTrigger={alignItemWithTrigger}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="z-50"
      >
        <SelectPrimitive.Popup
          ref={ref}
          className={cn(
            "relative z-50 flex max-h-[var(--available-height)] min-w-[var(--anchor-width)] flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="min-h-0 overflow-y-auto p-1">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.GroupLabel>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.GroupLabel>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.GroupLabel ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
));
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
SelectSeparator.displayName = "SelectSeparator";

type InferredItem = { value: SelectOptionValue; label: React.ReactNode };

function inferItemsFromChildren(children: React.ReactNode): InferredItem[] {
  const items: InferredItem[] = [];

  const visit = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (node) => {
      if (!React.isValidElement(node)) return;

      const props = node.props as { value?: unknown; children?: React.ReactNode };
      if (node.type === SelectItem) {
        if (typeof props.value === "string" || typeof props.value === "number") {
          items.push({ value: props.value, label: props.children });
        }
        return;
      }

      visit(props.children);
    });
  };

  visit(children);

  const uniqueItems = new Map<SelectOptionValue, InferredItem>();
  for (const item of items) uniqueItems.set(item.value, item);
  return [...uniqueItems.values()];
}

function Select<Value extends SelectOptionValue = string>({
  children,
  items,
  value,
  defaultValue,
  onValueChange,
  ...props
}: SelectProps<Value>) {
  const resolvedItems = items ?? inferItemsFromChildren(children);
  const hasEmptyValue = Array.isArray(resolvedItems)
    ? resolvedItems.some((item) => !("items" in item) && item.value === "")
    : Object.prototype.hasOwnProperty.call(resolvedItems ?? {}, "");
  const resolvedValue = value === "" && !hasEmptyValue ? null : value;
  const resolvedDefaultValue = defaultValue === "" && !hasEmptyValue ? null : defaultValue;

  return (
    <SelectPrimitive.Root<Value, false>
      {...props}
      items={resolvedItems}
      value={resolvedValue}
      defaultValue={resolvedDefaultValue}
      onValueChange={(next) => {
        if (next !== null) onValueChange?.(next);
      }}
    >
      {children}
    </SelectPrimitive.Root>
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
