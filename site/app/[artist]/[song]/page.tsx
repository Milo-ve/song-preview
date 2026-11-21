import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PreviewPlayer from "@/components/PreviewPlayer";
import StreamingLinks from "@/components/StreamingLinks";
import ThemeShell from "@/components/ThemeShell";
import { isPublic, type Release } from "@/lib/release";
import { formatReleaseDate, loadLinks } from "@/lib/release-view";
import { getRelease } from "@/lib/store";

type Props = {
  params: Promise<{ artist: string; song: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function loadVisible(
  props: Props,
): Promise<{ release: Release; isPreview: boolean } | null> {
  const [{ artist, song }, query] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const release = await getRelease(artist, song);
  if (!release) return null;
  if (isPublic(release.status)) return { release, isPreview: false };
  const key = typeof query.k === "string" ? query.k : undefined;
  return key && key === release.previewKey
    ? { release, isPreview: true }
    : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const found = await loadVisible(props);
  if (!found) return { title: "No encontrado" };
  const { release } = found;
  const title = `${release.title} · ${release.artist}`;
  const description = `"${release.title}", lo nuevo de ${release.artist}. Escucha el adelanto.`;
  return {
    title,
    description,
    robots: found.isPreview ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type: "music.song",
      images: [{ url: release.ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [release.ogUrl],
    },
  };
}

export default async function ReleasePage(props: Props) {
  const found = await loadVisible(props);
  if (!found) notFound();
  const { release, isPreview } = found;
  const { links, isLive } = await loadLinks(release);

  return (
    <ThemeShell theme={release.theme}>
      <div className="w-full max-w-sm flex flex-col items-center gap-7">
        {isPreview && (
          <p className="text-[11px] uppercase tracking-widest rounded-full px-3 py-1 bg-black/30">
            Vista previa ·{" "}
            {release.status === "pending"
              ? "pendiente de aprobación"
              : release.status}
          </p>
        )}

        <div className="w-56 sm:w-64 aspect-square relative rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)] rotate-[-1.5deg]">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob-hosted, already resized to 1400px at upload */}
          <img
            src={release.coverUrl}
            alt={`${release.title}: portada`}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-col items-center text-center gap-1.5">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {release.title}
          </h1>
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
            {release.artist}
          </p>
        </div>

        <p className="text-xs uppercase tracking-[0.3em] opacity-70">
          {isLive
            ? "Ya disponible"
            : `Sale el ${formatReleaseDate(release.releaseDate)}`}
        </p>

        <PreviewPlayer src={release.clipUrl} />

        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-[11px] uppercase tracking-widest opacity-50">
            Escucha en
          </p>
          <StreamingLinks links={links} />
        </div>
      </div>
    </ThemeShell>
  );
}
