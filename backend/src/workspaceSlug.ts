export function planningSpaceSlug(title: string, subject?: string): string {
  return [title, subject]
    .filter(Boolean)
    .join("-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter((part) => part && !["und", "oder", "der", "die", "das", "ein", "eine"].includes(part))
    .join("-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "planungsraum";
}
