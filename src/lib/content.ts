import { marked } from "marked";

export function renderMarkdown(md: string): string {
  if (!md) return "";
  return marked.parse(md, { async: false }) as string;
}

export function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "—";
  if (typeof val === "number") {
    return val.toLocaleString("en-US", { maximumFractionDigits: 3 });
  }
  return String(val);
}

