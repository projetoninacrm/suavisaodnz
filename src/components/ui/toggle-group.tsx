import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";

import { cn } from "@/lib/utils";
import { toggleVariants, type ToggleVariantProps } from "@/components/ui/toggle-variants";

const ToggleGroupContext = React.createContext<ToggleVariantProps>({
  size: "default",
  variant: "default",
});

type ToggleGroupProps = Omit<
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive>,
  "multiple" | "value" | "defaultValue" | "onValueChange"
> & {
  type: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
} & ToggleVariantProps;

const toValues = (value: string | string[] | undefined) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  return value === "" ? [] : [value];
};

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, variant, size, type, value, defaultValue, onValueChange, children, ...props }, ref) => (
    <ToggleGroupPrimitive
      ref={ref}
      multiple={type === "multiple"}
      value={toValues(value)}
      defaultValue={toValues(defaultValue)}
      onValueChange={(values) => onValueChange?.(type === "single" ? values[0] ?? "" : values)}
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant: variant ?? "default", size: size ?? "default" }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  ),
);

ToggleGroup.displayName = "ToggleGroup";

type ToggleGroupItemProps = React.ComponentPropsWithoutRef<typeof TogglePrimitive> & ToggleVariantProps;

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, children, variant, size, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext);

    return (
      <TogglePrimitive
        ref={ref}
        className={cn(
          toggleVariants({ variant: context.variant ?? variant, size: context.size ?? size }),
          className,
        )}
        {...props}
      >
        {children}
      </TogglePrimitive>
    );
  },
);

ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
