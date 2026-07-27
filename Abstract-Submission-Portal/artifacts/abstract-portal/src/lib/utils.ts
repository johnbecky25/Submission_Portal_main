import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiErrorMessage(err: unknown, fallback = "An unexpected error occurred"): string {
  if (err && typeof err === "object" && "error" in err && typeof (err as Record<string, unknown>).error === "string") {
    return (err as Record<string, string>).error;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
