import type { StreamingLink } from "@/lib/platforms";
import type { ArtistProfiles } from "@/lib/release";

const tile =
  "flex flex-col items-center justify-center text-center h-14 rounded-xl text-sm font-bold px-3";
const sub = "text-[10px] font-normal uppercase tracking-widest mt-0.5";

/**
 * One tile per platform: the song once it is out there; until then the
 * artist's profile ("Seguir") if we have it, otherwise a disabled "Pronto".
 */
export default function StreamingLinks({
  links,
  artist,
  profiles = {},
}: {
  links: StreamingLink[];
  artist: string;
  profiles?: ArtistProfiles;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full">
      {links.map((link) => {
        if (link.url)
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${tile} bg-[var(--fg)] text-[var(--bg)] hover:opacity-90 transition-opacity`}
            >
              {link.name}
            </a>
          );
        const profile = profiles[link.id];
        if (profile)
          return (
            <a
              key={link.id}
              href={profile}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Seguir a ${artist} en ${link.name}`}
              className={`${tile} border border-[var(--fg)]/70 text-[var(--fg)] hover:bg-[var(--fg)]/10 transition-colors`}
            >
              {link.name}
              <span className={`${sub} text-[var(--accent)]`}>Seguir</span>
            </a>
          );
        return (
          <div
            key={link.id}
            aria-disabled="true"
            className={`${tile} border border-[var(--fg)]/25 text-[var(--fg)]/50`}
          >
            {link.name}
            <span className={sub}>Pronto</span>
          </div>
        );
      })}
    </div>
  );
}
