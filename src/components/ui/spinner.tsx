import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const Spinner = React.forwardRef<SVGSVGElement, React.ComponentProps<typeof LoaderCircle>>(
  ({ className, ...props }, ref) => (
    <LoaderCircle ref={ref} aria-hidden="true" className={cn("size-4 animate-spin", className)} {...props} />
  ),
);
Spinner.displayName = "Spinner";

export { Spinner };
