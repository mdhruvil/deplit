import { clsx, type ClassValue } from "clsx";
import {
  differenceInDays,
  formatDistanceToNow,
  intervalToDuration,
} from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date) {
  return formatDistanceToNow(date, {
    addSuffix: true,
  });
}

export function formatDateToDaysFromNow(date: Date) {
  const days = differenceInDays(new Date(), date);
  return days === 0 ? "Today" : `${days}d ago`;
}

export function deploymentTargetToText(target: "PRODUCTION" | "PREVIEW") {
  return target === "PRODUCTION" ? "Production" : "Preview";
}

export function formatMilliseconds(ms: number) {
  if (ms === 0) return "0s";
  if (ms < 1000) return `${ms}ms`;
  const duration = intervalToDuration({ start: 0, end: ms });
  const parts = [];

  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);
  if (duration.seconds) parts.push(`${duration.seconds}s`);

  return parts.join(" ");
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [" B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${value} ${sizes[i]}`;
}
