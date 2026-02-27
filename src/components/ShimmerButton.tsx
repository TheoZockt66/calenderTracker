"use client";

import React, { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      borderRadius = "16px",
      shimmerDuration = "3s",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
          } as CSSProperties
        }
        className={cn("shimmer-button", className)}
        ref={ref}
        {...props}
      >
        <div className="shimmer-button__spark-container">
          <div className="shimmer-button__spark">
            <div className="shimmer-button__spark-before" />
          </div>
        </div>
        <span className="shimmer-button__content">{children}</span>
        <div className="shimmer-button__highlight" />
        <div className="shimmer-button__backdrop" />
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";
