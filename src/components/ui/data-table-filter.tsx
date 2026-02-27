"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const DataTableFilter: React.FC<DataTableFilterProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  isMultiSelect = false,
  className,
}) => {
  const currentValues = Array.isArray(selectedValues)
    ? selectedValues
    : selectedValues
      ? [selectedValues]
      : [];

  const handleSelect = (value: string) => {
    let newValues: string[];

    if (isMultiSelect) {
      if (currentValues.includes(value)) {
        newValues = currentValues.filter((v) => v !== value);
      } else {
        newValues = [...currentValues, value];
      }
    } else {
      newValues = currentValues.includes(value) ? [] : [value];
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

  const handleClear = () => onChange([]);

  const handleSelectAll = () => {
    onChange(isAllSelected ? [] : options.map((o) => o.value));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer",
            "border border-[var(--app-border)] hover:border-[var(--app-border-strong)]",
            currentValues.length > 0
              ? "bg-[var(--app-fg)] text-[var(--app-bg)] border-transparent hover:border-transparent hover:opacity-90"
              : "bg-transparent text-[var(--app-text-secondary)]",
            className,
          )}
          aria-label={`Filter by ${label}. Current selection: ${getButtonText()}`}
        >
          <span>{getButtonText()}</span>
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {options.map((option) => {
            const isSelected = currentValues.includes(option.value);
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={isSelected}
                onCheckedChange={() => handleSelect(option.value)}
                onSelect={(e) => {
                  if (isMultiSelect) e.preventDefault();
                }}
                className="cursor-pointer"
              >
                {option.icon && (
                  <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                {option.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuGroup>

        {(isMultiSelect || currentValues.length > 0) && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between p-1">
              {isMultiSelect && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="w-1/2 h-7 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {isAllSelected ? "Keine" : "Alle"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isNoneSelected}
                className={cn(
                  "h-7 text-xs text-destructive hover:bg-destructive/10 transition-colors",
                  isMultiSelect ? "w-1/2" : "w-full",
                )}
              >
                Filter löschen
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { DataTableFilter };
