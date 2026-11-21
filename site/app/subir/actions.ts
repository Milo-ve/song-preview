"use server";

import { checkUploadCode } from "@/lib/auth";
import { releasePath, submissionSchema, type Release } from "@/lib/release";
import { slugify } from "@/lib/slug";
import { releaseExists, saveRelease } from "@/lib/store";

export type SubmitResult =
  { ok: true; path: string; previewUrl: string } | { ok: false; error: string };

/** Only accept media that was uploaded to this project's Blob store. */
function isOwnBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

async function freeSongSlug(artistSlug: string, base: string): Promise<string> {
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    if (!(await releaseExists(artistSlug, candidate))) return candidate;
  }
  throw new Error("Demasiados releases con ese título");
}

export async function submitRelease(
  code: string,
  input: unknown,
): Promise<SubmitResult> {
  if (!checkUploadCode(code))
    return { ok: false, error: "Código de acceso inválido" };

  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" · "),
    };
  const data = parsed.data;
  if (![data.coverUrl, data.ogUrl, data.clipUrl].every(isOwnBlobUrl)) {
    return { ok: false, error: "Archivos inválidos; vuelve a subirlos" };
  }

  const artistSlug = slugify(data.artist);
  const titleSlug = slugify(data.title);
  if (!artistSlug || !titleSlug)
    return {
      ok: false,
      error: "El nombre o el título necesitan letras o números",
    };

  const now = new Date().toISOString();
  const release: Release = {
    ...data,
    artistSlug,
    songSlug: await freeSongSlug(artistSlug, titleSlug),
    status: "pending",
    previewKey: Buffer.from(
      crypto.getRandomValues(new Uint8Array(18)),
    ).toString("base64url"),
    linkOverrides: {},
    createdAt: now,
    updatedAt: now,
  };
  await saveRelease(release);

  const path = releasePath(release);
  return { ok: true, path, previewUrl: `${path}?k=${release.previewKey}` };
}
