/* MyClinics service worker  basic offline shell.
 *
 * Strategy:
 *   - Install: precache a tiny shell (icons + manifest + offline page).
 *   - Fetch:
 *       * Network-first for navigations and /api/* so the live site always
 *         wins when the network is available.
 *       * Cache-first for static build assets (/_next/static/*, icons).
 *       * Offline fallback for navigations when the network fails.
 *
 * Bumping CACHE_NAME invalidates old caches on activation.
 */
const CACHE_NAME = "myclinics-v2";
const SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/favicon-96x96.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations + /api/* (proxy). Always go to network so
  // users see fresh auth/data; only fall back to cache when offline.
  if (req.mode === "navigate" || url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          if (req.mode === "navigate" && fresh.ok) {
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          if (req.mode === "navigate") {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(req);
            if (cached) return cached;
            const offline = await cache.match("/offline");
            if (offline) return offline;
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  // Cache-first for static build assets.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          return cached ?? new Response("Offline", { status: 503 });
        }
      })()
    );
  }
});
