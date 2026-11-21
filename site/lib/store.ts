import "server-only";
import { del, list, put } from "@vercel/blob";
import { releaseSchema, type Release } from "./release";

/**
 * Releases are JSON files in Vercel Blob under releases/<artist>/<song>/.
 * Each write gets a random suffix so the public URL is unguessable (the JSON
 * holds pre-release metadata and the artist's email); only the server can
 * `list()` to find it. The newest file wins; older versions are deleted after a write.
 */
const PREFIX = "releases/";

function dirFor(artistSlug: string, songSlug: string) {
  return `${PREFIX}${artistSlug}/${songSlug}/`;
}

type BlobEntry = { url: string; pathname: string; uploadedAt: Date };

async function listAll(prefix: string): Promise<BlobEntry[]> {
  const out: BlobEntry[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs.filter((b) => b.pathname.endsWith(".json")));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

async function readEntry(entry: BlobEntry): Promise<Release | null> {
  const res = await fetch(entry.url, { cache: "no-store" });
  if (!res.ok) return null;
  const parsed = releaseSchema.safeParse(await res.json());
  return parsed.success ? parsed.data : null;
}

function newestPerDir(entries: BlobEntry[]): BlobEntry[] {
  const byDir = new Map<string, BlobEntry>();
  for (const e of entries) {
    const dir = e.pathname.slice(0, e.pathname.lastIndexOf("/") + 1);
    const cur = byDir.get(dir);
    if (!cur || e.uploadedAt > cur.uploadedAt) byDir.set(dir, e);
  }
  return [...byDir.values()];
}

export async function getRelease(
  artistSlug: string,
  songSlug: string,
): Promise<Release | null> {
  const [newest] = newestPerDir(await listAll(dirFor(artistSlug, songSlug)));
  return newest ? readEntry(newest) : null;
}

export async function listReleases(): Promise<Release[]> {
  const entries = newestPerDir(await listAll(PREFIX));
  const releases = await Promise.all(entries.map(readEntry));
  return releases
    .filter((r): r is Release => r !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveRelease(release: Release): Promise<void> {
  const dir = dirFor(release.artistSlug, release.songSlug);
  const before = await listAll(dir);
  await put(`${dir}release.json`, JSON.stringify(release, null, 2), {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  if (before.length) await del(before.map((b) => b.url));
}

export async function releaseExists(
  artistSlug: string,
  songSlug: string,
): Promise<boolean> {
  const page = await list({ prefix: dirFor(artistSlug, songSlug), limit: 1 });
  return page.blobs.length > 0;
}
