"use client";

import React from "react";
import type { HoursPerKey } from "@/lib/types";

interface HoursBarProps {
  data: HoursPerKey[];
}

export function HoursBar({ data }: HoursBarProps) {
  const maxHours = Math.max(...data.map((d) => d.hours));

  return (
    <div className="space-y-3.5">
      {data.map((item, i) => (
        <div key={item.name} className="group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-semibold">{item.name}</span>
            <span className="text-[12px] font-bold text-[var(--app-text-muted)] tabular-nums">
              {item.hours}h
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--app-accent-soft)]">
            <div
              className="bar-animate h-full rounded-full bg-[var(--app-fg)] group-hover:opacity-70 transition-opacity"
              style={{
                width: `${(item.hours / maxHours) * 100}%`,
                animationDelay: `${i * 80}ms`,
                opacity: 0.3 + (item.hours / maxHours) * 0.7,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
