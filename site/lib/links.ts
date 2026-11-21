import { PLATFORMS, type PlatformId, type StreamingLink } from "./platforms";
import type { LinkOverrides } from "./release";

type Fetcher = (url: string) => Promise<Response>;

const ONE_HOUR = 3600;

/** Cache tag on every platform lookup; /admin "Buscar links ahora" expires it with updateTag. */
export const LINKS_TAG = "platform-links";

/** Default fetcher: cached by Next's data cache for an hour so pages re-check distribution hourly. */
const defaultFetch: Fetcher = (url) => fetch(url, { next: { revalidate: ONE_HOUR, tags: [LINKS_TAG] } });

async function getJson<T>(fetcher: Fetcher, url: string): Promise<T | null> {
  try {
    const res = await fetcher(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Deezer resolves a UPC to an album without an API key. Returns the album URL or null. */
export async function lookupDeezerByUpc(
  upc: string,
  fetcher: Fetcher = defaultFetch,
) {
  const data = await getJson<{ link?: string; error?: unknown }>(
    fetcher,
    `https://api.deezer.com/album/upc:${encodeURIComponent(upc)}`,
  );
  return data && !data.error && data.link ? data.link : null;
}

/** iTunes Search API resolves a UPC to an Apple Music album URL without an API key. */
export async function lookupAppleByUpc(
  upc: string,
  fetcher: Fetcher = defaultFetch,
) {
  const data = await getJson<{ results?: { collectionViewUrl?: string }[] }>(
    fetcher,
    `https://itunes.apple.com/lookup?upc=${encodeURIComponent(upc)}&entity=album`,
  );
  const url = data?.results?.find(
    (r) => r.collectionViewUrl,
  )?.collectionViewUrl;
  return url ? url.replace(/[?&]uo=\d+/, "") : null;
}

type OdesliResponse = {
  linksByPlatform?: Record<string, { url?: string } | undefined>;
};

/** Odesli (song.link) expands one platform URL into links for every platform it knows. */
export async function lookupOdesli(
  seedUrl: string,
  fetcher: Fetcher = defaultFetch,
): Promise<Partial<Record<PlatformId, string>>> {
  const data = await getJson<OdesliResponse>(
    fetcher,
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(seedUrl)}`,
  );
  const byPlatform = data?.linksByPlatform ?? {};
  const out: Partial<Record<PlatformId, string>> = {};
  for (const p of PLATFORMS) {
    const url = byPlatform[p.odesliKey]?.url;
    if (url) out[p.id] = url;
  }
  return out;
}

export type ResolvedLinks = {
  links: StreamingLink[];
  /** True once at least one platform link exists — the release is out. */
  isLive: boolean;
};

/**
 * Cascade: manual overrides win → UPC lookups (Deezer, Apple) give seed URLs and
 * direct links → Odesli fills in the rest. Every network failure degrades to "no link".
 */
export async function resolveLinks(
  input: { upc?: string; linkOverrides?: LinkOverrides },
  fetcher: Fetcher = defaultFetch,
): Promise<ResolvedLinks> {
  const overrides = input.linkOverrides ?? {};
  const found: Partial<Record<PlatformId, string>> = {};

  if (input.upc) {
    const [deezer, apple] = await Promise.all([
      lookupDeezerByUpc(input.upc, fetcher),
      lookupAppleByUpc(input.upc, fetcher),
    ]);
    if (deezer) found.deezer = deezer;
    if (apple) found.appleMusic = apple;
  }

  const seed =
    overrides.spotify ??
    overrides.appleMusic ??
    found.appleMusic ??
    found.deezer ??
    Object.values(overrides)[0];
  if (seed) {
    const odesli = await lookupOdesli(seed, fetcher);
    for (const [id, url] of Object.entries(odesli) as [PlatformId, string][]) {
      found[id] ??= url;
    }
  }

  const merged = { ...found, ...overrides };
  const links: StreamingLink[] = PLATFORMS.filter(
    (p) => p.primary || merged[p.id],
  ).map((p) => ({
    id: p.id,
    name: p.name,
    url: merged[p.id] ?? null,
  }));

  return { links, isLive: links.some((l) => l.url !== null) };
}
