export function accountReturnPath(value: string | string[] | undefined) {
  if (typeof value !== "string") return "/profile";
  if (["/", "/atlas", "/learn", "/profile"].includes(value)) return value;
  if (/^\/learn#lesson=[a-z0-9-]+(?:&scene=[a-z0-9-]+)?$/.test(value) && value.length <= 180) return value;
  return "/profile";
}
