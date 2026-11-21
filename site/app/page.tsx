import Link from "next/link";
import ThemeShell from "@/components/ThemeShell";

export default function Home() {
  return (
    <ThemeShell>
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
          song preview
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          La página de tu próximo lanzamiento
        </h1>
        <p className="text-sm opacity-75">
          Comparte un adelanto de tu canción antes de que salga. El día del
          lanzamiento, los botones de Spotify, Apple Music, YouTube Music y
          Deezer aparecen solos.
        </p>
        <Link
          href="/subir"
          className="h-14 w-full flex items-center justify-center rounded-xl bg-[var(--fg)] text-[var(--bg)] font-bold hover:opacity-90"
        >
          Crea tu página
        </Link>
      </div>
    </ThemeShell>
  );
}
