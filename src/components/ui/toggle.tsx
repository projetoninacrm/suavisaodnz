import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";

import { cn } from "@/lib/utils";
import { toggleVariants, type ToggleVariantProps } from "@/components/ui/toggle-variants";

type ToggleProps = React.ComponentPropsWithoutRef<typeof TogglePrimitive> & ToggleVariantProps;

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = "Toggle";

export { Toggle };
