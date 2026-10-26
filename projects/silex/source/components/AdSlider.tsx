"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SponsoredCard, type AdItem } from "@/components/SponsoredCard";

const INTERVAL = 5000;

export function AdSlider({ ads }: { ads: AdItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = ads.length;

  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    const slide = track?.children[i] as HTMLElement | undefined;
    if (!track || !slide) return;
    const t = track.getBoundingClientRect();
    const s = slide.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === "rtl";
    track.scrollBy({ left: rtl ? s.right - t.right : s.left - t.left, behavior: "smooth" });
  }, []);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const t = track.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === "rtl";
    let best = 0;
    let bestDist = Infinity;
    Array.from(track.children).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(rtl ? r.right - t.right : r.left - t.left);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  };

  const pause = () => {
    clearTimeout(resumeTimer.current);
    setPaused(true);
  };
  const resume = (delay = 4000) => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), delay);
  };

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!document.hidden) goTo((active + 1) % count);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [active, count, paused, goTo]);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  if (count === 0) return null;
  if (count === 1) return <SponsoredCard ad={ads[0]} />;

  return (
    <section dir="rtl" aria-label="الإعلانات" className="select-none">
      <style>{`@keyframes adslide-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
      <div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={pause}
        onPointerUp={() => resume()}
        onPointerCancel={() => resume()}
        onMouseEnter={pause}
        onMouseLeave={() => resume(800)}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ads.map((ad, i) => (
          <div
            key={ad.id}
            className={`w-[88%] shrink-0 snap-start transition duration-500 sm:w-[78%] md:w-full ${
              i === active ? "scale-100 opacity-100" : "scale-[0.96] opacity-70"
            }`}
          >
            <SponsoredCard ad={ad} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {ads.map((ad, i) => (
          <button
            key={ad.id}
            type="button"
            aria-label={`الإعلان ${i + 1}`}
            onClick={() => goTo(i)}
            className={`relative h-1.5 overflow-hidden rounded-full bg-ink/20 transition-all duration-300 ${
              i === active ? "w-7" : "w-1.5"
            }`}
          >
            {i === active && (
              <span
                className="absolute inset-0 origin-right rounded-full bg-ink"
                style={{
                  animation: `adslide-fill ${INTERVAL}ms linear forwards`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
