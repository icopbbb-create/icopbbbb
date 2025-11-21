// components/ui/select.tsx
"use client";

import React, { forwardRef } from "react";
import * as RadixSelect from "@radix-ui/react-select";

// basic classNames helper
function cn(...args: Array<string | undefined | false>) {
  return args.filter(Boolean).join(" ");
}

/**
 * This file provides a lightweight wrapper around Radix Select primitives.
 * The important bit: SelectContent is rendered inside a Portal so it escapes
 * transformed/overflow:hidden ancestors and floats above the page.
 *
 * Usage in your app (existing code) stays the same:
 * import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
 */

export const Select = RadixSelect.Root;

export const SelectTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger> & { className?: string }
>(({ className, children, ...props }, ref) => {
  return (
    <RadixSelect.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-between gap-2 px-4 py-2 rounded-md border bg-white text-sm text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
        className
      )}
      {...props}
    >
      {children}
    </RadixSelect.Trigger>
  );
});
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Value> & { placeholder?: string; className?: string }
>(({ className, children, ...props }, ref) => {
  return (
    <RadixSelect.Value ref={ref} className={cn("truncate", className)} {...props}>
      {children}
    </RadixSelect.Value>
  );
});
SelectValue.displayName = "SelectValue";

export const SelectContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content> & { className?: string }
>(({ className, children, ...props }, ref) => {
  // we keep Radix to compute placements (it sets style.left/top),
  // and we make sure the element is fixed and high z-index so it won't be clipped.
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        ref={ref}
        className={cn(
          "min-w-[160px] rounded-md border bg-white shadow-lg overflow-hidden z-[99999]",
          className
        )}
        // ensure Radix can set left/top; we do not override left/top here.
        {...props}
      >
        <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
});
SelectContent.displayName = "SelectContent";

export const SelectItem = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item> & { className?: string }
>(({ className, children, ...props }, ref) => {
  return (
    <RadixSelect.Item
      ref={ref}
      className={cn(
        "cursor-pointer select-none rounded-sm px-3 py-2 text-sm leading-tight hover:bg-gray-100",
        className
      )}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
});
SelectItem.displayName = "SelectItem";

// re-export any other primitives you might use
export const SelectTriggerIcon = RadixSelect.Icon;
export const SelectGroup = RadixSelect.Group;
export const SelectLabel = RadixSelect.Label;
export const SelectSeparator = RadixSelect.Separator;
