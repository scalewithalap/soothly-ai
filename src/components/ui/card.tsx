import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
}

const variantClasses: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "bg-white dark:bg-gray-800 rounded-lg shadow-sm",
  bordered:
    "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
  elevated: "bg-white dark:bg-gray-800 rounded-lg shadow-lg",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], "p-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
