import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatContactName = (contact) => {
  if (!contact) return 'Unknown contact';
  return `${contact.firstName} ${contact.midInitials ? contact.midInitials + ' ' : ''}${contact.lastName}`.trim();
};
