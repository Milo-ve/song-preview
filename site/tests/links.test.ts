import { describe, expect, it } from "vitest";
import { lookupAppleByUpc, lookupDeezerByUpc, resolveLinks } from "@/lib/links";

type Routes = Record<string, unknown>;

/** Fake fetch: first route whose key is a substring of the URL wins; unmatched → 404. `"throw"` simulates a network error. */
function fakeFetch(routes: Routes) {
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response("not found", { status: 404 });
    if (routes[key] === "throw") throw new Error("network");
    return new Response(JSON.stringify(routes[key]), { status: 200 });
  };
  return { fetcher, calls };
}

const UPC = "885000123269";
const DEEZER = "https://www.deezer.com/album/1047026872";
const APPLE =
  "https://music.apple.com/us/album/tal-vez-un-te-single/6798355621";
const SPOTIFY = "https://open.spotify.com/album/6b2FCLZHN3F4P9eKCpumPW";

describe("UPC lookups", () => {
  it("reads Deezer's album link and treats Deezer's error payload as not found", async () => {
    expect(
      await lookupDeezerByUpc(
        UPC,
        fakeFetch({ "api.deezer.com": { link: DEEZER } }).fetcher,
      ),
    ).toBe(DEEZER);
    expect(
      await lookupDeezerByUpc(
        UPC,
        fakeFetch({ "api.deezer.com": { error: { code: 800 } } }).fetcher,
      ),
    ).toBeNull();
  });

  it("strips iTunes' affiliate uo= param", async () => {
    const f = fakeFetch({
      "itunes.apple.com": { results: [{ collectionViewUrl: `${APPLE}?uo=4` }] },
    });
    expect(await lookupAppleByUpc(UPC, f.fetcher)).toBe(APPLE);
  });
});

describe("resolveLinks", () => {
  it("before distribution: nothing found, primary platforms shown as pending", async () => {
    const { fetcher } = fakeFetch({
      "api.deezer.com": { error: {} },
      "itunes.apple.com": { results: [] },
    });
    const r = await resolveLinks({ upc: UPC }, fetcher);
    expect(r.isLive).toBe(false);
    expect(r.links.map((l) => l.id)).toEqual([
      "spotify",
      "appleMusic",
      "youtubeMusic",
      "deezer",
    ]);
    expect(r.links.every((l) => l.url === null)).toBe(true);
  });

  it("after distribution: UPC → seed → Odesli fills every platform", async () => {
    const { fetcher, calls } = fakeFetch({
      "api.deezer.com": { link: DEEZER },
      "itunes.apple.com": { results: [{ collectionViewUrl: APPLE }] },
      "api.song.link": {
        linksByPlatform: {
          spotify: { url: SPOTIFY },
          youtubeMusic: { url: "https://music.youtube.com/watch?v=x" },
          tidal: { url: "https://tidal.com/album/1" },
        },
      },
    });
    const r = await resolveLinks({ upc: UPC }, fetcher);
    expect(r.isLive).toBe(true);
    const byId = Object.fromEntries(r.links.map((l) => [l.id, l.url]));
    expect(byId).toMatchObject({
      spotify: SPOTIFY,
      appleMusic: APPLE,
      deezer: DEEZER,
      tidal: "https://tidal.com/album/1",
    });
    expect(byId.amazonMusic).toBeUndefined(); // non-primary platforms only appear once found
    expect(calls.find((c) => c.includes("song.link"))).toContain(
      encodeURIComponent(APPLE),
    );
  });

  it("manual overrides win and seed Odesli even without a UPC", async () => {
    const manualDeezer = "https://www.deezer.com/album/999";
    const { fetcher } = fakeFetch({
      "api.song.link": {
        linksByPlatform: {
          deezer: { url: DEEZER },
          appleMusic: { url: APPLE },
        },
      },
    });
    const r = await resolveLinks(
      { linkOverrides: { spotify: SPOTIFY, deezer: manualDeezer } },
      fetcher,
    );
    const byId = Object.fromEntries(r.links.map((l) => [l.id, l.url]));
    expect(byId).toMatchObject({
      spotify: SPOTIFY,
      deezer: manualDeezer,
      appleMusic: APPLE,
    });
  });

  it("network failures degrade to no links instead of throwing", async () => {
    const { fetcher } = fakeFetch({
      "api.deezer.com": "throw",
      "itunes.apple.com": "throw",
    });
    const r = await resolveLinks({ upc: UPC }, fetcher);
    expect(r.isLive).toBe(false);
  });

  it("Odesli down: still shows the links the UPC lookups found", async () => {
    const { fetcher } = fakeFetch({
      "api.deezer.com": { link: DEEZER },
      "api.song.link": "throw",
    });
    const r = await resolveLinks({ upc: UPC }, fetcher);
    expect(r.links.find((l) => l.id === "deezer")?.url).toBe(DEEZER);
    expect(r.isLive).toBe(true);
  });
});
