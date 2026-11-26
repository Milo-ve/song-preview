import { describe, expect, it } from "vitest";
import {
  cleanPlatformUrl,
  linkOverridesSchema,
  platformUrlsFromForm,
  releaseSchema,
  submissionSchema,
} from "@/lib/release";
import { isSlug, slugify } from "@/lib/slug";

const valid = {
  artist: "Oye Milo",
  title: "Tal Vez Un Té",
  releaseDate: "2026-08-14",
  distributor: "",
  upc: "885000123269",
  isrc: "",
  contactEmail: "artista@example.com",
  coverUrl: "https://x.public.blob.vercel-storage.com/c.jpg",
  ogUrl: "https://x.public.blob.vercel-storage.com/o.jpg",
  clipUrl: "https://x.public.blob.vercel-storage.com/a.mp3",
  theme: { bg: "#153f43", fg: "#f4e9df", accent: "#e6a7d7" },
};

describe("submissionSchema", () => {
  it("accepts a full submission and turns blank optionals into undefined", () => {
    const r = submissionSchema.parse(valid);
    expect(r.distributor).toBeUndefined();
    expect(r.isrc).toBeUndefined();
    expect(r.upc).toBe("885000123269");
  });

  it("rejects malformed UPC, email and non-https media", () => {
    expect(submissionSchema.safeParse({ ...valid, upc: "12345" }).success).toBe(
      false,
    );
    expect(
      submissionSchema.safeParse({ ...valid, contactEmail: "nope" }).success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({
        ...valid,
        clipUrl: "http://evil.test/a.mp3",
      }).success,
    ).toBe(false);
  });

  it("accepts an optional https pre-save link", () => {
    expect(submissionSchema.parse(valid).presaveUrl).toBeUndefined();
    expect(
      submissionSchema.parse({ ...valid, presaveUrl: "" }).presaveUrl,
    ).toBeUndefined();
    expect(
      submissionSchema.parse({
        ...valid,
        presaveUrl: "https://hypeddit.com/g1c32a",
      }).presaveUrl,
    ).toBe("https://hypeddit.com/g1c32a");
    for (const bad of ["http://hypeddit.com/x", "javascript:alert(1)"]) {
      expect(
        submissionSchema.safeParse({ ...valid, presaveUrl: bad }).success,
      ).toBe(false);
    }
  });

  it("normalizes ISRC to upper case", () => {
    expect(
      submissionSchema.parse({ ...valid, isrc: "usrc17607839" }).isrc,
    ).toBe("USRC17607839");
  });
});

describe("linkOverridesSchema", () => {
  it("only accepts known platforms with https URLs", () => {
    expect(
      linkOverridesSchema.safeParse({ spotify: "https://open.spotify.com/x" })
        .success,
    ).toBe(true);
    expect(
      linkOverridesSchema.safeParse({ myspace: "https://myspace.com" }).success,
    ).toBe(false);
    expect(
      linkOverridesSchema.safeParse({ spotify: "javascript:alert(1)" }).success,
    ).toBe(false);
  });
});

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("Tal Vez Un Té")).toBe("tal-vez-un-te");
    expect(slugify("  Niño & Niña!! ")).toBe("nino-y-nina");
    expect(slugify("¿¡")).toBe("");
    expect(isSlug(slugify("Ñandú 2000"))).toBe(true);
  });
});

describe("artistProfiles", () => {
  it("defaults to {} so releases saved before the field still parse", () => {
    expect(submissionSchema.parse(valid).artistProfiles).toEqual({});
    const stored = {
      ...valid,
      artistSlug: "oye-milo",
      songSlug: "tal-vez-un-te",
      status: "approved",
      previewKey: "x".repeat(24),
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(releaseSchema.parse(stored).artistProfiles).toEqual({});
  });

  it("accepts https profiles on known platforms only", () => {
    const ok = submissionSchema.safeParse({
      ...valid,
      artistProfiles: { spotify: "https://open.spotify.com/artist/abc" },
    });
    expect(ok.success).toBe(true);
    for (const artistProfiles of [
      { spotify: "javascript:alert(1)" },
      { myspace: "https://myspace.com/x" },
    ]) {
      expect(
        submissionSchema.safeParse({ ...valid, artistProfiles }).success,
      ).toBe(false);
    }
  });
});

describe("platformUrlsFromForm", () => {
  it("drops blanks, adds a missing https:// and keeps other schemes for validation", () => {
    const form = new FormData();
    form.set("profile_spotify", "  open.spotify.com/artist/abc ");
    form.set("profile_deezer", "");
    form.set("profile_appleMusic", "https://music.apple.com/mx/artist/x/1");
    form.set("profile_youtubeMusic", "javascript:alert(1)");
    form.set("link_spotify", "https://open.spotify.com/track/t");
    expect(platformUrlsFromForm(form, "profile_")).toEqual({
      spotify: "https://open.spotify.com/artist/abc",
      appleMusic: "https://music.apple.com/mx/artist/x/1",
      youtubeMusic: "javascript:alert(1)",
    });
  });
});

describe("cleanPlatformUrl", () => {
  it("drops Spotify's locale segment and share tracking", () => {
    expect(
      cleanPlatformUrl(
        "https://open.spotify.com/intl-es/artist/1lahx8B5kdxIGuRhxsSw5U?si=8A6hJMgvStySUxEW3fUbiQ",
      ),
    ).toBe("https://open.spotify.com/artist/1lahx8B5kdxIGuRhxsSw5U");
  });

  it("keeps meaningful params and only strips tracking ones", () => {
    expect(
      cleanPlatformUrl(
        "music.youtube.com/channel/UC123?feature=share&utm_source=ig",
      ),
    ).toBe("https://music.youtube.com/channel/UC123?feature=share");
  });

  it("leaves non-https input alone so validation rejects it", () => {
    expect(cleanPlatformUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
    expect(cleanPlatformUrl("http://x.com/a?si=1")).toBe("http://x.com/a?si=1");
  });
});
