import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonGroupProps = React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
};

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = "horizontal", role = "group", ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      data-orientation={orientation}
      className={cn(
        "inline-flex w-fit items-center gap-1",
        orientation === "vertical" && "flex-col items-stretch",
        className,
      )}
      {...props}
    />
  ),
);
ButtonGroup.displayName = "ButtonGroup";

export { ButtonGroup };
