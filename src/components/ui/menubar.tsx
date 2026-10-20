import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const MenubarMenu = MenuPrimitive.Root;
const MenubarGroup = MenuPrimitive.Group;
const MenubarPortal = MenuPrimitive.Portal;
const MenubarSub = MenuPrimitive.SubmenuRoot;
const MenubarRadioGroup = MenuPrimitive.RadioGroup;

type PositionerProps = React.ComponentPropsWithoutRef<typeof MenuPrimitive.Positioner>;
type PopupProps = React.ComponentPropsWithoutRef<typeof MenuPrimitive.Popup>;
type MenubarContentProps = PopupProps & Pick<PositionerProps, "align" | "alignOffset" | "collisionPadding" | "side" | "sideOffset">;

const Menubar = React.forwardRef<React.ElementRef<typeof MenubarPrimitive>, React.ComponentPropsWithoutRef<typeof MenubarPrimitive>>(
  ({ className, ...props }, ref) => (
    <MenubarPrimitive ref={ref} className={cn("flex h-10 items-center gap-1 rounded-md border bg-background p-1", className)} {...props} />
  ),
);
Menubar.displayName = "Menubar";

const MenubarTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof MenuPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <MenuPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-8 cursor-default select-none items-center rounded-sm px-3 text-sm font-medium outline-none transition-colors data-[open]:bg-accent data-[open]:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  ),
);
MenubarTrigger.displayName = "MenubarTrigger";

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubmenuTrigger>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubmenuTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <MenuPrimitive.SubmenuTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[open]:bg-accent data-[open]:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-4" aria-hidden="true" />
  </MenuPrimitive.SubmenuTrigger>
));
MenubarSubTrigger.displayName = "MenubarSubTrigger";

const MenubarSubContent = React.forwardRef<React.ElementRef<typeof MenuPrimitive.Popup>, MenubarContentProps>(
  ({ className, align = "start", alignOffset, collisionPadding = 8, side = "inline-end", sideOffset = 4, ...props }, ref) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} alignOffset={alignOffset} collisionPadding={collisionPadding} side={side} sideOffset={sideOffset} className="z-50 outline-none">
        <MenuPrimitive.Popup
          ref={ref}
          className={cn(
            "z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  ),
);
MenubarSubContent.displayName = "MenubarSubContent";

const MenubarContent = React.forwardRef<React.ElementRef<typeof MenuPrimitive.Popup>, MenubarContentProps>(
  ({ className, align = "start", alignOffset = -4, collisionPadding = 8, side = "bottom", sideOffset = 8, ...props }, ref) => (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} alignOffset={alignOffset} collisionPadding={collisionPadding} side={side} sideOffset={sideOffset} className="z-50 outline-none">
        <MenuPrimitive.Popup
          ref={ref}
          className={cn(
            "z-50 min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  ),
);
MenubarContent.displayName = "MenubarContent";

type ItemProps = React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item> & { inset?: boolean };
const MenubarItem = React.forwardRef<React.ElementRef<typeof MenuPrimitive.Item>, ItemProps>(({ className, inset, ...props }, ref) => (
  <MenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
MenubarItem.displayName = "MenubarItem";

const MenubarCheckboxItem = React.forwardRef<React.ElementRef<typeof MenuPrimitive.CheckboxItem>, React.ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem>>(
  ({ className, children, ...props }, ref) => (
    <MenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center"><MenuPrimitive.CheckboxItemIndicator><Check className="size-4" aria-hidden="true" /></MenuPrimitive.CheckboxItemIndicator></span>
      {children}
    </MenuPrimitive.CheckboxItem>
  ),
);
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";

const MenubarRadioItem = React.forwardRef<React.ElementRef<typeof MenuPrimitive.RadioItem>, React.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>>(
  ({ className, children, ...props }, ref) => (
    <MenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center"><MenuPrimitive.RadioItemIndicator><Circle className="size-2 fill-current" aria-hidden="true" /></MenuPrimitive.RadioItemIndicator></span>
      {children}
    </MenuPrimitive.RadioItem>
  ),
);
MenubarRadioItem.displayName = "MenubarRadioItem";

const MenubarLabel = React.forwardRef<React.ElementRef<typeof MenuPrimitive.GroupLabel>, React.ComponentPropsWithoutRef<typeof MenuPrimitive.GroupLabel> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => <MenuPrimitive.GroupLabel ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />,
);
MenubarLabel.displayName = "MenubarLabel";

const MenubarSeparator = React.forwardRef<React.ElementRef<typeof MenuPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>>(
  ({ className, ...props }, ref) => <MenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />,
);
MenubarSeparator.displayName = "MenubarSeparator";

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />
);
MenubarShortcut.displayName = "MenubarShortcut";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
