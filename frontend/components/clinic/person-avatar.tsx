"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getAvatarUrl, type AvatarOwnerType } from "@/lib/clinic-api";
import { NameAvatar } from "@/components/clinic/name-avatar";

const cache = new Map<string, Promise<string | null>>();

export function bustAvatarCache(clinicId: string, ownerType: AvatarOwnerType, ownerId: string) {
  cache.delete(`${clinicId}:${ownerType}:${ownerId}`);
}

function avatarKey(clinicId: string, ownerType: AvatarOwnerType, ownerId: string) {
  return `${clinicId}:${ownerType}:${ownerId}`;
}

/**
 * Profile-photo avatar with initials fallback.
 * Fetches a signed R2 URL once per owner (module-level cache); the cache is
 * busted after an upload via `bustAvatarCache` (or by bumping `refreshKey`).
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

  useEffect(() => {
    const key = avatarKey(clinicId, ownerType, ownerId);
    const force = refreshKey !== seenRefresh.current;
    seenRefresh.current = refreshKey;
    let promise = force ? undefined : cache.get(key);
    if (!promise) {
      promise = getAvatarUrl(clinicId, ownerType, ownerId)
        .then((res) => res.url)
        .catch(() => null);
      cache.set(key, promise);
    }
    let cancelled = false;
    promise.then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [clinicId, ownerType, ownerId, refreshKey]);

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
    />
  );
}