export function initials(displayName: string) {
  return displayName.trim().split(/\s+/u).slice(0, 2).map(part => Array.from(part)[0]?.toLocaleUpperCase("ru")).join("");
}
