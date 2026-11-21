import { PLATFORMS, type PlatformId, type StreamingLink } from "./platforms";
import type { LinkOverrides } from "./release";

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** Optional credentials. Without them, Deezer + Apple (keyless) and manual links still work. */
export type LinkCredentials = {
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  /** Odesli/song.link closed its keyless API (401 PUBLIC_API_ACCESS_DEPRECATED); it only runs with a key. */
  odesliApiKey?: string;
};

export function credentialsFromEnv(): LinkCredentials {
  return {
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    odesliApiKey: process.env.ODESLI_API_KEY,
  };
}

const ONE_HOUR = 3600;

/** Cache tag on every platform lookup; /admin "Buscar links ahora" expires it with updateTag. */
export const LINKS_TAG = "platform-links";

/** Default fetcher: cached by Next's data cache for an hour so pages re-check distribution hourly. */
const defaultFetch: Fetcher = (url, init) =>
  init?.cache
    ? fetch(url, init)
    : fetch(url, {
        ...init,
        next: { revalidate: ONE_HOUR, tags: [LINKS_TAG] },
      });

async function getJson<T>(
  fetcher: Fetcher,
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetcher(url, init);
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

/** Spotify Web API (client-credentials) search `upc:<UPC>`. Needs a free app at developer.spotify.com. */
export async function lookupSpotifyByUpc(
  upc: string,
  creds: LinkCredentials,
  fetcher: Fetcher = defaultFetch,
) {
  if (!creds.spotifyClientId || !creds.spotifyClientSecret) return null;
  const basic = Buffer.from(
    `${creds.spotifyClientId}:${creds.spotifyClientSecret}`,
  ).toString("base64");
  const token = await getJson<{ access_token?: string }>(
    fetcher,
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    },
  );
  if (!token?.access_token) return null;
  const data = await getJson<{
    albums?: { items?: { external_urls?: { spotify?: string } }[] };
  }>(
    fetcher,
    `https://api.spotify.com/v1/search?type=album&limit=1&q=${encodeURIComponent(`upc:${upc}`)}`,
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  );
  return data?.albums?.items?.[0]?.external_urls?.spotify ?? null;
}

type OdesliResponse = {
  linksByPlatform?: Record<string, { url?: string } | undefined>;
};

/** Odesli (song.link) expands one platform URL into links for every platform it knows. Requires an API key. */
export async function lookupOdesli(
  seedUrl: string,
  apiKey: string | undefined,
  fetcher: Fetcher = defaultFetch,
): Promise<Partial<Record<PlatformId, string>>> {
  if (!apiKey) return {};
  const data = await getJson<OdesliResponse>(
    fetcher,
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(seedUrl)}&key=${encodeURIComponent(apiKey)}`,
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
 * Cascade: manual overrides win → UPC lookups (Deezer, Apple keyless; Spotify with
 * credentials) → Odesli fills the rest when a key is set. Every failure degrades to "no link".
 */
export async function resolveLinks(
  input: { upc?: string; linkOverrides?: LinkOverrides },
  fetcher: Fetcher = defaultFetch,
  creds: LinkCredentials = credentialsFromEnv(),
): Promise<ResolvedLinks> {
  const overrides = input.linkOverrides ?? {};
  const found: Partial<Record<PlatformId, string>> = {};

  if (input.upc) {
    const [deezer, apple, spotify] = await Promise.all([
      lookupDeezerByUpc(input.upc, fetcher),
      lookupAppleByUpc(input.upc, fetcher),
      lookupSpotifyByUpc(input.upc, creds, fetcher),
    ]);
    if (deezer) found.deezer = deezer;
    if (apple) found.appleMusic = apple;
    if (spotify) found.spotify = spotify;
  }

  const seed =
    overrides.spotify ??
    found.spotify ??
    overrides.appleMusic ??
    found.appleMusic ??
    found.deezer ??
    Object.values(overrides)[0];
  if (seed) {
    const odesli = await lookupOdesli(seed, creds.odesliApiKey, fetcher);
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
