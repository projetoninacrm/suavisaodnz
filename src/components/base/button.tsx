import * as React from "react";
import { Button as BaseUIButton } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { baseButtonVariants } from "./button-variants";

export interface BaseButtonProps extends React.ComponentPropsWithoutRef<typeof BaseUIButton>, VariantProps<typeof baseButtonVariants> {}

export const BaseButton = React.forwardRef<HTMLElement, BaseButtonProps>(({ className, variant, size, ...props }, ref) => (
  <BaseUIButton ref={ref} className={cn(baseButtonVariants({ variant, size, className }))} {...props} />
));
BaseButton.displayName = "BaseButton";
