import type { VariantProps } from "class-variance-authority";
import { Link, type LinkProps } from "react-router-dom";
import { baseButtonVariants } from "@/components/base/button-variants";
import { cn } from "@/lib/utils";

type ButtonLinkProps = Omit<LinkProps, "className"> &
  VariantProps<typeof baseButtonVariants> & {
    className?: string;
  };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link {...props} className={cn(baseButtonVariants({ variant, size, className }))} />;
}
