import { describe, expect, it } from "vitest";
import { linkOverridesSchema, submissionSchema } from "@/lib/release";
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
