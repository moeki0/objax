/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GoogleGenAI } from "@google/genai";
import { put } from "@vercel/blob";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const IMAGE_MODEL =
  process.env.GOOGLE_GENAI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";

function buildFilename(mimeType: string) {
  const ext =
    mimeType === "image/jpeg"
      ? "jpg"
      : mimeType?.split("/")?.[1]?.split("+")?.[0] || "png";
  const random = Math.random().toString(36).slice(2, 8);
  return `images/${Date.now()}-${random}.${ext}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any).catch(
      () => null
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : undefined;
    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY is not set" },
        { status: 500 }
      );
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN is not set" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
    });
    const part = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p?.inlineData?.data
    );
    const inlineData = (part as any)?.inlineData;
    if (!inlineData?.data) {
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: 500 }
      );
    }
    const mimeType = inlineData?.mimeType || "image/png";
    const buffer = Buffer.from(inlineData.data, "base64");
    const blob = await put(buildFilename(mimeType), buffer, {
      access: "public",
      contentType: mimeType,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: `Failed to create image ${e}` },
      { status: 500 }
    );
  }
}
