"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface AnimatedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

const easeOutQuint: [number, number, number, number] = [0.23, 1, 0.32, 1];

export const AnimatedSelect: React.FC<AnimatedSelectProps> = ({
  value,
  onChange,
  options,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer border border-(--app-border) hover:border-ring bg-transparent text-(--app-text-secondary)"
        aria-expanded={isOpen}
      >
        <span>{selectedLabel}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, y: -6 }}
            animate={{ height: "auto", y: 0 }}
            exit={{ height: 0, y: -6 }}
            transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.8 }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 9999,
              overflow: "hidden",
              minWidth: "160px",
              backgroundColor: "var(--app-surface)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-2">
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.04 + index * 0.02,
                      duration: 0.15,
                      ease: easeOutQuint,
                    }}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected ? "text-foreground font-medium" : "text-muted-foreground",
                    )}
                  >
                    <span className="flex-1 text-left">{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
