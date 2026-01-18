import * as React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-14 h-14 text-xl",
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    { src, alt = "Avatar", fallback, size = "md", className, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={256}
            height={256}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-gray-600 dark:text-gray-300">
            {fallback ?? alt?.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

