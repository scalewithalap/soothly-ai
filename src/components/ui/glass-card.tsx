import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradient?: boolean;
}

export function GlassCard({
  children,
  className,
  gradient = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:shadow-xl dark:border-white/5 dark:bg-white/5",
        gradient &&
          "hover:bg-linear-to-br hover:from-white/5 hover:to-transparent",
        className
      )}
      {...props}
    >
      {/* Subtle consistent shine */}
      <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {children}
    </div>
  );
}
