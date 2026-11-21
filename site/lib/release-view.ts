import "server-only";
import { resolveLinks, type ResolvedLinks } from "./links";
import type { Release } from "./release";
import { saveRelease } from "./store";

/**
 * Resolves the release's streaming links and, the first time any link shows up
 * for an approved release, promotes it to `live` (the distribution went out).
 */
export async function loadLinks(release: Release): Promise<ResolvedLinks> {
  const resolved = await resolveLinks(release);
  if (resolved.isLive && release.status === "approved") {
    const now = new Date().toISOString();
    try {
      await saveRelease({
        ...release,
        status: "live",
        liveAt: now,
        updatedAt: now,
      });
    } catch {
      // Promotion is best-effort; the page still shows the links.
    }
  }
  return resolved;
}

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatReleaseDate(isoDate: string): string {
  return dateFmt.format(new Date(`${isoDate}T00:00:00Z`));
}
