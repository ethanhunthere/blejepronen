import { cn } from "@/lib/utils";
import { type ClassValue } from "clsx";

interface SkeletonProps {
  className?: ClassValue;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}
