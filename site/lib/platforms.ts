/** Streaming platforms the page can show, in display order. `odesliKey` matches `linksByPlatform` keys from api.song.link. */
export const PLATFORMS = [
  { id: "spotify", name: "Spotify", odesliKey: "spotify", primary: true },
  {
    id: "appleMusic",
    name: "Apple Music",
    odesliKey: "appleMusic",
    primary: true,
  },
  {
    id: "youtubeMusic",
    name: "YouTube Music",
    odesliKey: "youtubeMusic",
    primary: true,
  },
  { id: "deezer", name: "Deezer", odesliKey: "deezer", primary: true },
  {
    id: "amazonMusic",
    name: "Amazon Music",
    odesliKey: "amazonMusic",
    primary: false,
  },
  { id: "tidal", name: "Tidal", odesliKey: "tidal", primary: false },
  {
    id: "soundcloud",
    name: "SoundCloud",
    odesliKey: "soundcloud",
    primary: false,
  },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as [
  PlatformId,
  ...PlatformId[],
];

export type StreamingLink = {
  id: PlatformId;
  name: string;
  /** Live URL once the release is on this platform, or null while pending. */
  url: string | null;
};
