import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { checkUploadCode } from "@/lib/auth";

const LIMITS: Record<string, { types: string[]; maxBytes: number }> = {
  "clip.mp3": { types: ["audio/mpeg"], maxBytes: 3 * 1024 * 1024 },
  "cover.jpg": { types: ["image/jpeg"], maxBytes: 4 * 1024 * 1024 },
  "og.jpg": { types: ["image/jpeg"], maxBytes: 2 * 1024 * 1024 },
};

/** Issues short-lived client tokens so /subir uploads go browser → Blob directly. */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { code } = JSON.parse(clientPayload ?? "{}") as { code?: string };
        if (!checkUploadCode(code))
          throw new Error("Código de acceso inválido");
        const file = pathname.split("/").pop() ?? "";
        const limit = LIMITS[file];
        if (!pathname.startsWith("uploads/") || !limit)
          throw new Error("Archivo no permitido");
        return {
          allowedContentTypes: limit.types,
          maximumSizeInBytes: limit.maxBytes,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
