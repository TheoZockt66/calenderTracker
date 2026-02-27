"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface ButtonColorfulProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function ButtonColorful({
  className,
  label = "Explore Components",
  ...props
}: ButtonColorfulProps) {
  return (
    <Button
      variant={null as any}
      className={cn(
        "relative h-10 px-4 overflow-hidden rounded-xl border-0",
        "!border-none !outline-none",
        "bg-zinc-900 dark:bg-zinc-100",
        "transition-all duration-200",
        "group",
        className
      )}
      {...props}
    >
      {/* Gradient background effect */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
          "opacity-40 group-hover:opacity-80",
          "blur transition-opacity duration-500"
        )}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        <span className="text-white font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">{label}</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
      </div>
    </Button>
  );
}
