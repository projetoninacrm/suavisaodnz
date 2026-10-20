import * as React from "react";
import { cn } from "@/lib/utils";

type TypesetProps = React.ComponentProps<"div"> & { preset?: "default" | "chat" | "document" };

function Typeset({ preset = "default", className, ...props }: TypesetProps) {
  return <div data-slot="typeset" className={cn("typeset", preset !== "default" && `typeset-${preset}`, className)} {...props} />;
}

export { Typeset };
