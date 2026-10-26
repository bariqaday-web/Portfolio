"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getActiveStoryMerchantIds } from "@/lib/activeStories";

export function StoryRingAvatar({
  userId,
  avatarUrl,
  alt = "",
  size = 40,
  fallback,
  onClick,
  className = "",
}: {
  userId: string | null | undefined;
  avatarUrl: string | null | undefined;
  alt?: string;
  size?: number;
  fallback?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const [hasStory, setHasStory] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    getActiveStoryMerchantIds().then((ids) => {
      if (alive) setHasStory(ids.has(userId));
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const ringPad = hasStory ? Math.max(2, Math.round(size * 0.04)) : 0;

  const inner = (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center bg-black text-white ${
        hasStory ? "border-2 border-card" : ""
      }`}
      style={{ width: size - ringPad * 2, height: size - ringPad * 2 }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        fallback
      )}
    </div>
  );

  const content = (
    <div
      className={`rounded-full flex items-center justify-center ${
        hasStory ? "bg-gradient-to-tr from-lime-400 via-green-400 to-emerald-300 shadow-[0_0_8px_rgba(132,204,22,0.55)]" : ""
      } ${className}`}
      style={{ width: size, height: size, padding: ringPad }}
    >
      {inner}
    </div>
  );

  return onClick ? (
    <button type="button" onClick={onClick} aria-label={alt} className="shrink-0">
      {content}
    </button>
  ) : (
    content
  );
}
