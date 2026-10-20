import * as React from "react";

type AspectRatioProps = React.ComponentPropsWithoutRef<"div"> & { ratio?: number };

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio = 1, style, ...props }, ref) => (
    <div ref={ref} style={{ aspectRatio: ratio, ...style }} {...props} />
  ),
);

AspectRatio.displayName = "AspectRatio";

export { AspectRatio };
