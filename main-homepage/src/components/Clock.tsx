"use client";

import { useEffect, useState } from "react";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="h-[84px]" aria-hidden />;
  }

  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hour = now.getHours();
  const greeting =
    hour < 5
      ? "Good night"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

  return (
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-white/40">
        {greeting}
      </p>
      <div className="mt-2 flex items-baseline gap-4">
        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
          {time}
        </h1>
        <p className="text-sm text-white/50">{date}</p>
      </div>
    </div>
  );
}
