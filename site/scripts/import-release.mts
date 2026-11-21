/**
 * Operator path: create a release from local files when the artist can't use /subir
 * (or to import an existing release). Uses ffmpeg locally; uploads only the clip,
 * the 1400px cover and the OG card. Needs BLOB_READ_WRITE_TOKEN.
 *
 *   npm run import-release -- \
 *     --artist "Oye Milo" --title "Tal Vez Un Té" --date 2026-08-14 --email artista@example.com \
 *     --cover ./portada.jpg  (--audio ./master.wav --start 1:19 [--length 30] | --clip ./preview.mp3) \
 *     [--og ./og.jpg] [--upc 885000123269] [--status pending|approved|live] \
 *     [--theme "#153f43,#f4e9df,#e6a7d7"] [--link spotify=https://...]...
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { put } from "@vercel/blob";
import {
  DEFAULT_THEME,
  linkOverridesSchema,
  releasePath,
  releaseSchema,
  submissionSchema,
  type Release,
} from "../lib/release";
import { slugify } from "../lib/slug";
import { getRelease, saveRelease } from "../lib/store";

const { values } = parseArgs({
  options: {
    artist: { type: "string" },
    title: { type: "string" },
    date: { type: "string" },
    email: { type: "string" },
    cover: { type: "string" },
    og: { type: "string" },
    audio: { type: "string" },
    clip: { type: "string" },
    start: { type: "string", default: "0" },
    length: { type: "string", default: "30" },
    upc: { type: "string" },
    isrc: { type: "string" },
    distributor: { type: "string" },
    status: { type: "string", default: "pending" },
    theme: { type: "string" },
    link: { type: "string", multiple: true, default: [] },
  },
});

function need(name: keyof typeof values): string {
  const v = values[name];
  if (typeof v !== "string" || !v) throw new Error(`Falta --${name}`);
  return v;
}

/** "1:19" or "79" → 79 */
const toSeconds = (t: string) =>
  t.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);

const ffmpeg = (args: string[]) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

const [bg, fg, accent] = values.theme
  ? values.theme.split(",")
  : [DEFAULT_THEME.bg, DEFAULT_THEME.fg, DEFAULT_THEME.accent];
const theme = { bg, fg, accent };
const tmp = mkdtempSync(join(tmpdir(), "song-preview-"));

let clipPath = values.clip;
if (!clipPath) {
  const start = toSeconds(values.start!);
  const len = Number(values.length);
  clipPath = join(tmp, "clip.mp3");
  ffmpeg([
    "-ss",
    String(start),
    "-t",
    String(len),
    "-i",
    need("audio"),
    "-af",
    `afade=t=in:d=1,afade=t=out:st=${len - 1}:d=1,loudnorm=I=-14:TP=-1`,
    "-ar",
    "44100",
    "-ac",
    "2",
    "-b:a",
    "128k",
    clipPath,
  ]);
}

const coverPath = join(tmp, "cover.jpg");
ffmpeg([
  "-i",
  need("cover"),
  "-vf",
  "crop='min(iw,ih)':'min(iw,ih)',scale=1400:1400",
  "-q:v",
  "3",
  coverPath,
]);

let ogPath = values.og;
if (!ogPath) {
  ogPath = join(tmp, "og.jpg");
  ffmpeg([
    "-i",
    coverPath,
    "-vf",
    `scale=630:630,pad=1200:630:(ow-iw)/2:0:color=${bg.replace("#", "0x")}`,
    "-q:v",
    "3",
    ogPath,
  ]);
}

const folder = `uploads/import-${Date.now()}`;
async function upload(path: string, name: string, contentType: string) {
  const blob = await put(`${folder}/${name}`, readFileSync(path), {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });
  return blob.url;
}

const [clipUrl, coverUrl, ogUrl] = await Promise.all([
  upload(clipPath, "clip.mp3", "audio/mpeg"),
  upload(coverPath, "cover.jpg", "image/jpeg"),
  upload(ogPath, "og.jpg", "image/jpeg"),
]);

const submission = submissionSchema.parse({
  artist: need("artist"),
  title: need("title"),
  releaseDate: need("date"),
  distributor: values.distributor,
  upc: values.upc,
  isrc: values.isrc,
  contactEmail: need("email"),
  clipUrl,
  coverUrl,
  ogUrl,
  theme,
});

const linkOverrides = linkOverridesSchema.parse(
  Object.fromEntries(
    values.link.map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)]),
  ),
);

const artistSlug = slugify(submission.artist);
const songSlug = slugify(submission.title);
const existing = await getRelease(artistSlug, songSlug);
const now = new Date().toISOString();
const release: Release = releaseSchema.parse({
  ...submission,
  artistSlug,
  songSlug,
  status: values.status,
  previewKey:
    existing?.previewKey ??
    Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString(
      "base64url",
    ),
  linkOverrides,
  createdAt: existing?.createdAt ?? now,
  updatedAt: now,
  liveAt: values.status === "live" ? (existing?.liveAt ?? now) : undefined,
});
await saveRelease(release);

console.log(
  `${existing ? "Actualizado" : "Creado"}: ${releasePath(release)} (${release.status})`,
);
console.log(
  `Vista previa: ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${releasePath(release)}?k=${release.previewKey}`,
);
