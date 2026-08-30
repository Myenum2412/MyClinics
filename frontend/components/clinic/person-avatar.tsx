"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getAvatarUrl, type AvatarOwnerType } from "@/lib/clinic-api";
import { NameAvatar } from "@/components/clinic/name-avatar";

const cache = new Map<string, Promise<string | null>>();
const bustListeners = new Map<string, Set<() => void>>();

export function bustAvatarCache(clinicId: string, ownerType: AvatarOwnerType, ownerId: string) {
  const key = `${clinicId}:${ownerType}:${ownerId}`;
  const promise = cache.get(key);
  if (promise) {
    // Revoke previous blob object URL to prevent memory leak
    promise
      .then((url) => {
        if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      })
      .catch(() => {});
  }
  cache.delete(key);
  const listeners = bustListeners.get(key);
  if (listeners) listeners.forEach((fn) => fn());
}

function avatarKey(clinicId: string, ownerType: AvatarOwnerType, ownerId: string) {
  return `${clinicId}:${ownerType}:${ownerId}`;
}

/**
 * Profile-photo avatar with initials fallback.
 * Fetches avatar bytes with Bearer auth and creates a blob URL (no cookie needed for <img>).
 * Cache is busted via `bustAvatarCache` after upload or by bumping `refreshKey`.
 */
export function PersonAvatar({
  clinicId,
  ownerType,
  ownerId,
  name,
  className,
  size = "sm",
  refreshKey = 0,
}: {
  clinicId: string;
  ownerType: AvatarOwnerType;
  ownerId: string;
  name: string;
  className?: string;
  size?: "xs" | "sm" | "md";
  refreshKey?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const seenRefresh = useRef(0);
  const currentUrlRef = useRef<string | null>(null);
  const [bustTick, setBustTick] = useState(0);

  useEffect(() => {
    const key = avatarKey(clinicId, ownerType, ownerId);
    let set = bustListeners.get(key);
    if (!set) {
      set = new Set();
      bustListeners.set(key, set);
    }
    const onBust = () => setBustTick((v) => v + 1);
    set.add(onBust);
    return () => {
      set!.delete(onBust);
      if (set!.size === 0) bustListeners.delete(key);
    };
  }, [clinicId, ownerType, ownerId]);

  useEffect(() => {
    if (!clinicId || !ownerId) {
      setUrl(null);
      return;
    }
    const key = avatarKey(clinicId, ownerType, ownerId);
    const force = refreshKey !== seenRefresh.current || bustTick > 0;
    if (force) seenRefresh.current = refreshKey;

    let promise = force ? undefined : cache.get(key);
    if (!promise) {
      promise = getAvatarUrl(clinicId, ownerType, ownerId)
        .then((res) => res.url)
        .catch(() => null);
      cache.set(key, promise);
    }
    let cancelled = false;
    promise.then((u) => {
      if (cancelled) {
        if (u && u.startsWith("blob:")) URL.revokeObjectURL(u);
        return;
      }
      // Revoke previous blob URL held by this instance
      if (currentUrlRef.current && currentUrlRef.current !== u && currentUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
      currentUrlRef.current = u;
      setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [clinicId, ownerType, ownerId, refreshKey, bustTick]);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current && currentUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
    };
  }, []);

  if (!url) {
    return <NameAvatar name={name} className={className} size={size} />;
  }

  const sizeClass =
    size === "xs"
      ? "size-5"
      : size === "md"
        ? "size-9"
        : "size-7.5";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      className={cn(
        "inline-flex shrink-0 rounded-full object-cover select-none",
        sizeClass,
        className
      )}
      onError={() => {
        // If blob fails, fall back to initials
        if (currentUrlRef.current && currentUrlRef.current.startsWith("blob:")) {
          URL.revokeObjectURL(currentUrlRef.current);
        }
        currentUrlRef.current = null;
        setUrl(null);
      }}
    />
  );
}
