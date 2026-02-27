"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "peer-checked:bg-primary peer-checked:border-primary",
        destructive: "peer-checked:bg-destructive peer-checked:border-destructive",
      },
      size: {
        default: "h-8 w-[52px]",
        sm: "h-6 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof switchVariants> {
  onCheckedChange?: (checked: boolean) => void;
  showIcons?: boolean;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, size, variant, checked, defaultChecked, onCheckedChange, showIcons = false, disabled, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newValue = e.target.checked;
      if (checked === undefined) {
        setIsChecked(newValue);
      }
      onCheckedChange?.(newValue);
    };

    const isSmall = size === "sm";
    const translateDist = isSmall ? "translate-x-[16px]" : "translate-x-[20px]";
    const handleSizeUnchecked = isSmall ? "w-3 h-3 ml-[2px]" : "w-4 h-4 ml-[2px]";
    const handleSizeChecked = isSmall ? "w-4 h-4" : "w-6 h-6";
    const iconClasses = isSmall ? "w-2.5 h-2.5" : "w-3.5 h-3.5";

    return (
      <label
        className={cn(
          "group relative inline-flex items-center justify-center",
          disabled && "cursor-not-allowed opacity-50",
          "min-w-[48px] min-h-[48px]"
        )}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />

        <div
          className={cn(
            switchVariants({ variant, size }),
            "bg-[var(--app-accent-soft)] border-[var(--app-border)]",
            isChecked && "bg-[var(--app-fg)] border-[var(--app-fg)]",
            className
          )}
        >
          <div
            className={cn(
              "pointer-events-none block h-full w-full transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
              isChecked ? translateDist : "translate-x-0"
            )}
          >
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 shadow-sm transition-all duration-300 flex items-center justify-center rounded-full left-[2px]",
                isChecked ? "bg-[var(--app-bg)]" : "bg-[var(--app-fg)]",
                isChecked ? handleSizeChecked : handleSizeUnchecked
              )}
            >
              {showIcons && (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-all duration-300",
                      isChecked ? "opacity-100 scale-100" : "opacity-0 scale-50"
                    )}
                  >
                    <Check className={cn(iconClasses, "text-[var(--app-fg)]")} strokeWidth={4} />
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center transition-all duration-300",
                      !isChecked ? "opacity-100 scale-100" : "opacity-0 scale-50"
                    )}
                  >
                    <X className={cn(iconClasses, "text-[var(--app-bg)]")} strokeWidth={4} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </label>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
