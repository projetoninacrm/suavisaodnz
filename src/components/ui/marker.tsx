import * as React from "react";
import { cn } from "@/lib/utils";

const Marker = React.forwardRef<HTMLElement, React.ComponentProps<"mark">>(({ className, ...props }, ref) => (
  <mark ref={ref} data-slot="marker" className={cn("rounded-sm bg-primary/15 px-0.5 text-foreground", className)} {...props} />
));
Marker.displayName = "Marker";

export { Marker };
