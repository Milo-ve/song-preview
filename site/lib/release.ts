import { z } from "zod";
import { PLATFORM_IDS } from "./platforms";

/**
 * Lifecycle of a release (see ../CONTEXT.md):
 * pending → approved → live, or pending → rejected.
 */
export const RELEASE_STATUSES = [
  "pending",
  "approved",
  "live",
  "rejected",
] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);
const httpsUrl = z
  .string()
  .url("Link inválido")
  .startsWith("https://", "El link debe empezar con https://");

export const themeSchema = z.object({
  bg: hexColor,
  fg: hexColor,
  accent: hexColor,
});
export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = {
  bg: "#153f43",
  fg: "#f4e9df",
  accent: "#e6a7d7",
};

/** UPC/EAN: 12–13 digits. Empty string is treated as "not provided". */
export const upcSchema = z
  .string()
  .trim()
  .regex(/^\d{12,13}$/, "El UPC debe tener 12 o 13 dígitos");

export const isrcSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/, "ISRC inválido (ej. USRC17607839)");

/** Pre-save link from the distributor or a service (Hypeddit, HyperFollow, Feature.fm…). */
export const presaveUrlSchema = httpsUrl;

const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema.optional(),
  );

const platformUrlsSchema = z.partialRecord(
  z.enum(PLATFORM_IDS),
  httpsUrl,
);

/** Manual song links per platform; they win over the automatic lookup. */
export const linkOverridesSchema = platformUrlsSchema;
export type LinkOverrides = z.infer<typeof linkOverridesSchema>;

/** The artist's profile per platform. Until the song is out there, its button sends fans to follow the artist. */
export const artistProfilesSchema = platformUrlsSchema;
export type ArtistProfiles = z.infer<typeof artistProfilesSchema>;

/**
 * Reads `<prefix><platformId>` fields from a form. Blank fields are dropped and
 * a missing scheme becomes https:// (people paste "open.spotify.com/…").
 */
export function platformUrlsFromForm(
  form: FormData,
  prefix: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of PLATFORM_IDS) {
    const v = String(form.get(`${prefix}${id}`) ?? "").trim();
    if (v) out[id] = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  }
  return out;
}

/** What the artist sends from /subir. Single source of truth for intake fields (see ../_shared/checklist-artista.md). */
export const submissionSchema = z.object({
  artist: z.string().trim().min(1, "Falta el nombre del artista").max(80),
  title: z.string().trim().min(1, "Falta el título").max(120),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  distributor: optional(z.string().trim().max(60)),
  upc: optional(upcSchema),
  isrc: optional(isrcSchema),
  /** Stored for a future version; not shown on the page (fans follow the artist instead). */
  presaveUrl: optional(presaveUrlSchema),
  artistProfiles: artistProfilesSchema.default({}),
  contactEmail: z.string().trim().email("Email inválido"),
  coverUrl: httpsUrl,
  ogUrl: httpsUrl,
  clipUrl: httpsUrl,
  theme: themeSchema,
});
export type Submission = z.infer<typeof submissionSchema>;

export const releaseSchema = submissionSchema.extend({
  artistSlug: z.string(),
  songSlug: z.string(),
  status: z.enum(RELEASE_STATUSES),
  /** Secret for viewing a non-public release: /<artist>/<song>?k=<previewKey>. */
  previewKey: z.string().min(16),
  linkOverrides: linkOverridesSchema.default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
  liveAt: z.string().optional(),
});
export type Release = z.infer<typeof releaseSchema>;

export function releasePath(
  r: Pick<Release, "artistSlug" | "songSlug">,
): string {
  return `/${r.artistSlug}/${r.songSlug}`;
}

export function isPublic(status: ReleaseStatus): boolean {
  return status === "approved" || status === "live";
}
