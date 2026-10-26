const DEFAULT_NEXT_PATH = "/home";

export function safeAuthNextPath(value: string | null, origin: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_NEXT_PATH;
  }

  try {
    const base = new URL(origin);
    const destination = new URL(value, base);
    if (destination.origin !== base.origin) return DEFAULT_NEXT_PATH;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
}

export function buildAuthCallbackUrl(
  currentOrigin: string,
  nextPath = DEFAULT_NEXT_PATH,
  canonicalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
): string {
  const configuredOrigin = canonicalSiteUrl?.trim() || currentOrigin;
  const site = new URL(configuredOrigin);
  if (site.username || site.password) throw new Error("Auth site URL must not contain credentials");
  if (process.env.NODE_ENV === "production" && site.protocol !== "https:") {
    throw new Error("Auth site URL must use HTTPS in production");
  }

  const callback = new URL("/auth/callback", site.origin);
  callback.searchParams.set("next", safeAuthNextPath(nextPath, site.origin));
  return callback.toString();
}