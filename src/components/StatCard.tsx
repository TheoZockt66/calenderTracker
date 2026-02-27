"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { GlowCard } from "./GlowCard";

interface StatCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  trend?: string;
}

export function StatCard({ label, value, suffix, icon: Icon, trend }: StatCardProps) {
  return (
    <GlowCard>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
            {label}
          </p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[28px] font-bold tracking-tight leading-none">
              {value}
            </span>
            {suffix && (
              <span className="text-[13px] font-medium text-[var(--app-text-muted)]">
                {suffix}
              </span>
            )}
          </div>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-[var(--success)]">
              <TrendingUp size={13} />
              <span className="text-[12px] font-semibold">{trend}</span>
            </div>
          )}
        </div>
        <div className="rounded-xl bg-[var(--app-accent-soft)] p-2.5">
          <Icon size={18} className="text-[var(--app-text-secondary)]" />
        </div>
      </div>
    </GlowCard>
  );
}
