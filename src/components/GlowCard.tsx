"use client";

import React from "react";
import { GlowingEffect } from "./GlowingEffect";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlowCard({ children, className = "" }: GlowCardProps) {
  return (
    <div className={`relative rounded-[16px] ${className}`}>
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={2}
      />
      <div className="relative glow-card p-5">{children}</div>
    </div>
  );
}
