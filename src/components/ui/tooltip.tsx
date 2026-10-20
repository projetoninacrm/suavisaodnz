import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipProviderProps = Omit<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>, "delay" | "timeout"> & {
  delayDuration?: number;
  skipDelayDuration?: number;
};

function TooltipProvider({ delayDuration = 700, skipDelayDuration = 300, ...props }: TooltipProviderProps) {
  return <TooltipPrimitive.Provider delay={delayDuration} timeout={skipDelayDuration} {...props} />;
}

type PositionerProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Positioner>;
type PopupProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup>;
type TooltipContentProps = PopupProps &
  Pick<PositionerProps, "align" | "alignOffset" | "collisionPadding" | "side" | "sideOffset">;

const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Popup>, TooltipContentProps>(
  (
    {
      className,
      align = "center",
      side = "top",
      sideOffset = 4,
      alignOffset,
      collisionPadding = 8,
      ...props
    },
    ref,
  ) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className="z-50"
      >
        <TooltipPrimitive.Popup
          ref={ref}
          className={cn(
            "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
