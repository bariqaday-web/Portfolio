"use client";

import { Play } from "lucide-react";

export function PostMediaThumbnail({
  imageUrl,
  thumbUrl,
  mediaType,
  alt,
}: {
  imageUrl: string | null;
  thumbUrl?: string | null;
  mediaType: "image" | "video" | "text";
  alt: string;
}) {
  const image = mediaType === "video" ? thumbUrl : imageUrl;

  if (image) {
    return (
      <>
        <img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
        {mediaType === "video" && (
          <span className="absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
            <Play size={14} fill="currentColor" aria-hidden="true" />
          </span>
        )}
      </>
    );
  }

  if (mediaType !== "video" || !imageUrl) return null;

  return (
    <>
      <video
        src={imageUrl}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (video.duration > 0) video.currentTime = Math.min(0.1, video.duration / 2);
        }}
        className="size-full object-cover"
        aria-label={alt}
      />
      <span className="absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
        <Play size={14} fill="currentColor" aria-hidden="true" />
      </span>
    </>
  );
}
