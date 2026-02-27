"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--app-accent-soft)' }}>
        <Icon size={32} style={{ color: 'var(--app-text-muted)' }} />
      </div>
      <h3 className="text-[15px] font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] max-w-xs" style={{ color: 'var(--app-text-muted)' }}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
