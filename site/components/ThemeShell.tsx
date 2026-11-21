import type { CSSProperties, ReactNode } from "react";
import { DEFAULT_THEME, type Theme } from "@/lib/release";

/** Full-screen background in the release's colors; children read them via var(--bg|--fg|--accent). */
export default function ThemeShell({
  theme = DEFAULT_THEME,
  children,
}: {
  theme?: Theme;
  children: ReactNode;
}) {
  const style = {
    "--bg": theme.bg,
    "--fg": theme.fg,
    "--accent": theme.accent,
    backgroundColor: theme.bg,
    color: theme.fg,
    backgroundImage: `linear-gradient(color-mix(in srgb, ${theme.fg} 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, ${theme.fg} 6%, transparent) 1px, transparent 1px)`,
    backgroundSize: "36px 36px",
  } as CSSProperties;

  return (
    <main
      className="flex flex-1 items-center justify-center px-4 py-12"
      style={style}
    >
      {children}
    </main>
  );
}
