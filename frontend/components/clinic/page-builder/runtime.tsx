"use client";

import { createContext, useContext, type ReactNode } from "react";

const WebsiteBuilderContext = createContext<string | null>(null);

/**
 * Shares the active clinic with custom Puck fields and interactive blocks.
 * Wrapped around both the builder and the public renderer.
 */
export function WebsiteBuilderProvider({
  clinicId,
  children,
}: {
  clinicId: string;
  children: ReactNode;
}) {
  return (
    <WebsiteBuilderContext.Provider value={clinicId}>
      {children}
    </WebsiteBuilderContext.Provider>
  );
}

export function useWebsiteBuilderClinicId(): string | null {
  return useContext(WebsiteBuilderContext);
}
