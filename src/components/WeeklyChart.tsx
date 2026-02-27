"use client";

import React from "react";
import type { WeeklyData } from "@/lib/types";

interface WeeklyChartProps {
  data: WeeklyData[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const maxHours = Math.max(...data.map((d) => d.hours));

  return (
    <div className="flex items-end gap-2.5 h-44">
      {data.map((item, i) => {
        const pct = (item.hours / maxHours) * 100;
        return (
          <div
            key={item.week}
            className="flex flex-1 flex-col items-center gap-2 h-full group"
          >
            <span className="text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              {item.hours}h
            </span>
            <div className="relative w-full flex-1 rounded-xl bg-[var(--app-accent-soft)] overflow-hidden">
              <div
                className="bar-animate absolute bottom-0 w-full rounded-xl bg-[var(--app-fg)] transition-all group-hover:opacity-80"
                style={{
                  height: `${pct}%`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-[var(--app-text-muted)]">
              {item.week}
            </span>
          </div>
        );
      })}
    </div>
  );
}
