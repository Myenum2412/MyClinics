"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function PreviewSheet({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          {children}
        </div>
        {footer && (
          <SheetFooter className="border-t border-border">{footer}</SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}