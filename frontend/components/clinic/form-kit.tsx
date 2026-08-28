"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, AlertCircle, X } from "lucide-react";

/** Sectioned card matching the PatientForm design. */
export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/** Sticky-header page shell (back link + title/subtitle) matching patients/new. */
export function FormShell({
  title,
  subtitle,
  backHref,
  error,
  onErrorDismiss,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  error?: string | null;
  onErrorDismiss?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <Link
                href={backHref}
                className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted mt-1"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Could not save</p>
              <p className="mt-0.5 text-destructive/80">{error}</p>
            </div>
            {onErrorDismiss && (
              <button
                className="ml-auto text-destructive/60 hover:text-destructive"
                onClick={onErrorDismiss}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
