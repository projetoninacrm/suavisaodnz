import * as React from "react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@/lib/utils";

type ProgressProps = Omit<
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
  "value"
> & { value?: number | null };

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = null, min = 0, max = 100, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      value={value}
      min={min}
      max={max}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Track className="h-full w-full">
        <ProgressPrimitive.Indicator className="h-full w-full bg-primary transition-all data-[status=indeterminate]:animate-pulse" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  ),
);

Progress.displayName = "Progress";

export { Progress };
