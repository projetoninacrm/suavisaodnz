import * as React from "react";
import { DirectionProvider as BaseDirectionProvider, type DirectionProviderProps } from "@base-ui/react/direction-provider";
import { cn } from "@/lib/utils";

type TextDirection = "ltr" | "rtl";

function Direction({ direction = "ltr", className, ...props }: React.ComponentProps<"div"> & { direction?: TextDirection }) {
  return (
    <BaseDirectionProvider direction={direction}>
      <div dir={direction} data-slot="direction" className={cn("text-start", className)} {...props} />
    </BaseDirectionProvider>
  );
}

export { BaseDirectionProvider as DirectionProvider, Direction, type DirectionProviderProps, type TextDirection };
