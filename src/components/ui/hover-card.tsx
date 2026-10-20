import * as React from "react";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";

import { cn } from "@/lib/utils";

const HoverCard = PreviewCardPrimitive.Root;
const HoverCardTrigger = PreviewCardPrimitive.Trigger;

type PositionerProps = React.ComponentPropsWithoutRef<typeof PreviewCardPrimitive.Positioner>;
type PopupProps = React.ComponentPropsWithoutRef<typeof PreviewCardPrimitive.Popup>;
type HoverCardContentProps = PopupProps & Pick<PositionerProps, "align" | "alignOffset" | "collisionPadding" | "side" | "sideOffset">;

const HoverCardContent = React.forwardRef<React.ElementRef<typeof PreviewCardPrimitive.Popup>, HoverCardContentProps>(
  ({ className, align = "center", alignOffset, collisionPadding = 8, side, sideOffset = 4, ...props }, ref) => (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        side={side}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <PreviewCardPrimitive.Popup
          ref={ref}
          className={cn(
            "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[starting-style]:animate-in data-[ending-style]:animate-out data-[starting-style]:fade-in data-[ending-style]:fade-out",
            className,
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  ),
);
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardTrigger, HoverCardContent };
