import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatAuthorName = (author) => {
  if (!author) return 'Unknown Author';
  return `${author.firstName} ${author.midInitials ? author.midInitials + ' ' : ''}${author.lastName}`.trim();
};