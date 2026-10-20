import * as React from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/lib/utils";

type SeparatorProps = React.ComponentPropsWithoutRef<typeof SeparatorPrimitive> & {
  decorative?: boolean;
};

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive>,
  SeparatorProps
>(({ className, orientation = "horizontal", decorative = true, "aria-hidden": ariaHidden, ...props }, ref) => (
  <SeparatorPrimitive
    ref={ref}
    orientation={orientation}
    aria-hidden={decorative ? true : ariaHidden}
    className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
