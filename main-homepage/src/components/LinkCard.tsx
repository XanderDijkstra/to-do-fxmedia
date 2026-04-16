"use client";

import { useRef, useState, useCallback } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import type { HomeLink } from "@/lib/links";

const SWIPE_THRESHOLD = 100;

interface LinkCardProps {
  link: HomeLink;
  onDismiss: (title: string) => void;
}

export function LinkCard({ link, onDismiss }: LinkCardProps) {
  const Icon = link.icon;
  const isPlaceholder = link.href === "#";

  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleStart = useCallback((clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    currentX.current = clientX;
    setSwiping(true);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging.current) return;
    currentX.current = clientX;
    const diff = currentX.current - startX.current;
    setOffsetX(diff);
  }, []);

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = currentX.current - startX.current;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      // Fling off screen in the swipe direction
      const direction = diff > 0 ? 1 : -1;
      setOffsetX(direction * window.innerWidth);
      setDismissed(true);
      setTimeout(() => onDismiss(link.title), 350);
    } else {
      // Snap back
      setOffsetX(0);
      setSwiping(false);
    }
  }, [link.title, onDismiss]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  // Mouse events (for desktop drag)
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => { if (isDragging.current) handleEnd(); };

  const progress = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if the user was swiping
    if (Math.abs(currentX.current - startX.current) > 5) {
      e.preventDefault();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`relative ${dismissed ? "h-0 overflow-hidden" : ""}`}
      style={{
        transition: dismissed
          ? "height 0.3s ease 0.1s, margin 0.3s ease 0.1s, opacity 0.3s ease"
          : undefined,
        opacity: dismissed ? 0 : 1,
      }}
    >
      {/* "Done" indicator behind the card */}
      {swiping && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          <div
            className="flex items-center gap-2 text-emerald-400"
            style={{ opacity: progress }}
          >
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">Done</span>
          </div>
        </div>
      )}

      <a
        href={link.href}
        target={isPlaceholder ? undefined : "_blank"}
        rel={isPlaceholder ? undefined : "noreferrer"}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12] p-5 backdrop-blur-sm transition-shadow duration-300 hover:border-white/20"
        style={{
          transform: `translateX(${offsetX}px) rotate(${offsetX * 0.03}deg)`,
          transition: isDragging.current
            ? "none"
            : "transform 0.35s cubic-bezier(.2,.8,.3,1)",
          cursor: isDragging.current ? "grabbing" : "grab",
        }}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${link.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
          aria-hidden
          style={{ pointerEvents: "none" }}
        />
        <div className="relative flex items-start justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${link.accent} ring-1 ring-white/10`}
          >
            <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
          </div>
          <ArrowUpRight className="h-4 w-4 text-white/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/80" />
        </div>
        <div className="relative mt-6">
          <h3 className="text-base font-semibold text-white">{link.title}</h3>
          <p className="mt-1 text-sm text-white/50">{link.description}</p>
        </div>
      </a>
    </div>
  );
}
