"use client";

import { useEffect } from "react";

/**
 * Registers the service worker shipped from /public/sw.js.
 *
 * Runs only in production builds and only in the browser  Next dev mode
 * bypasses SW registration to keep HMR reliable.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* ignore  PWA features are progressive, never blocking */
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }
  }, []);

  return null;
}
