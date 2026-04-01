"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  /** Unique key for the filter option. */
  value: string;
  /** Display label for the filter option. */
  label: string;
  /** Optional icon for the filter option. */
  icon?: React.ElementType;
}

export interface DataTableFilterProps {
  /** The descriptive label for the filter (e.g., "Status", "Priority"). */
  label: string;
  /** Array of available filter options. */
  options: FilterOption[];
  /** The currently selected filter value(s). */
  selectedValues: string | string[];
  /** Callback function when the selection changes. */
  onChange: (newValues: string[]) => void;
  /** If true, allows multiple options to be selected. */
  isMultiSelect?: boolean;
  /** Optional class name for the trigger button. */
  className?: string;
}

const easeOutQuint: [number, number, number, number] = [0.23, 1, 0.32, 1];

const DataTableFilter: React.FC<DataTableFilterProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  isMultiSelect = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentValues = Array.isArray(selectedValues)
    ? selectedValues
    : selectedValues
      ? [selectedValues]
      : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (value: string) => {
    let newValues: string[];
    if (isMultiSelect) {
      newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
    } else {
      newValues = currentValues.includes(value) ? [] : [value];
      setIsOpen(false);
    }
    onChange(newValues);
  };

  const getButtonText = () => {
    if (currentValues.length === 0) return label;
    if (currentValues.length === 1)
      return options.find((o) => o.value === currentValues[0])?.label || label;
    return `${label} (${currentValues.length})`;
  };

  const isAllSelected = currentValues.length === options.length;
  const isNoneSelected = currentValues.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer",
          "border border-(--app-border) hover:border-ring",
          currentValues.length > 0
            ? "bg-(--app-fg) text-(--app-bg) border-transparent hover:border-transparent hover:opacity-90"
            : "bg-transparent text-(--app-text-secondary)",
          className,
        )}
        aria-label={`Filter by ${label}. Current selection: ${getButtonText()}`}
        aria-expanded={isOpen}
      >
        <span>{getButtonText()}</span>
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
              left: 0,
              zIndex: 9999,
              overflow: "hidden",
              minWidth: "200px",
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
              <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {label}
              </p>
              <div className="h-px bg-border my-1" />

              {options.map((option, index) => {
                const isSelected = currentValues.includes(option.value);
                const Icon = option.icon;
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
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "relative w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0",
                        isSelected ? "bg-foreground border-foreground" : "border-border",
                      )}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-background" />}
                    </span>
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className="font-medium">{option.label}</span>
                  </motion.button>
                );
              })}

              {(isMultiSelect || currentValues.length > 0) && (
                <>
                  <div className="h-px bg-border my-1" />
                  <div className="flex items-center gap-1 px-1">
                    {isMultiSelect && (
                      <button
                        onClick={() => onChange(isAllSelected ? [] : options.map((o) => o.value))}
                        className="flex-1 h-7 text-xs text-muted-foreground rounded-md hover:bg-accent transition-colors font-medium"
                      >
                        {isAllSelected ? "Keine" : "Alle"}
                      </button>
                    )}
                    <button
                      onClick={() => onChange([])}
                      disabled={isNoneSelected}
                      className={cn(
                        "h-7 text-xs text-destructive rounded-md hover:bg-destructive/10 transition-colors font-medium disabled:opacity-40",
                        isMultiSelect ? "flex-1" : "w-full",
                      )}
                    >
                      Filter löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { DataTableFilter };
