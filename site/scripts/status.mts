/**
 * Rebuilds ../ops/_index.md from Vercel Blob: one line per release.
 * Generated file — never edit it by hand. Needs BLOB_READ_WRITE_TOKEN (vercel env pull .env.local).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { releasePath } from "../lib/release";
import { listReleases } from "../lib/store";

const OUT = fileURLToPath(new URL("../../ops/_index.md", import.meta.url));
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const releases = await listReleases();
const counts = releases.reduce<Record<string, number>>(
  (acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc),
  {},
);

const lines = [
  "# Índice de releases (GENERADO: `npm run status` en site/, no editar)",
  "",
  `Actualizado: ${new Date().toISOString()} · ${
    Object.entries(counts)
      .map(([s, n]) => `${s}: ${n}`)
      .join(" · ") || "sin releases"
  }`,
  "",
  "| status | artista | canción | sale | UPC | página |",
  "|---|---|---|---|---|---|",
  ...releases.map(
    (r) =>
      `| ${r.status} | ${r.artist} | ${r.title} | ${r.releaseDate} | ${r.upc ?? "—"} | ${site}${releasePath(r)} |`,
  ),
  "",
];

writeFileSync(OUT, lines.join("\n"));
console.log(lines.slice(2).join("\n"));
console.log(`\n→ ${OUT}`);
