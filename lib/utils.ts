import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PICKING_STATES: Record<
  string,
  { label: string; color: string; bg: string; text: string }
> = {
  draft: {
    label: "Borrador",
    color: "slate",
    bg: "bg-slate-700",
    text: "text-slate-300",
  },
  waiting: {
    label: "En espera",
    color: "orange",
    bg: "bg-orange-900/40",
    text: "text-orange-300",
  },
  confirmed: {
    label: "Confirmado",
    color: "blue",
    bg: "bg-blue-900/40",
    text: "text-blue-300",
  },
  assigned: {
    label: "Listo",
    color: "yellow",
    bg: "bg-yellow-900/40",
    text: "text-yellow-300",
  },
  done: {
    label: "Hecho",
    color: "green",
    bg: "bg-green-900/40",
    text: "text-green-300",
  },
  cancel: {
    label: "Cancelado",
    color: "red",
    bg: "bg-red-900/40",
    text: "text-red-300",
  },
};
