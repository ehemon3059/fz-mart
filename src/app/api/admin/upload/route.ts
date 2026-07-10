import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "node:crypto";
import { getCurrentAdmin } from "@/lib/auth";
import {
  uploadImage,
  isStorageConfigured,
  StorageError,
  STORAGE_FOLDERS,
  MAX_UPLOAD_BYTES,
  type StorageFolder,
} from "@/integrations/storage";

// Central admin image upload. In production, files go to object storage (R2)
// so they survive redeploys onto an empty local filesystem. When R2 isn't
// configured (local dev), we fall back to writing under public/uploads — fine
// for a single long-lived dev box, never for serverless/production.

// Content types are validated by the storage adapter; this mirror is only used
// by the dev fallback to pick a file extension.
const DEV_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const folderRaw = String(formData.get("folder") ?? "banners");
  const folder: StorageFolder = (STORAGE_FOLDERS as readonly string[]).includes(
    folderRaw,
  )
    ? (folderRaw as StorageFolder)
    : "banners";

  const buffer = Buffer.from(await file.arrayBuffer());

  if (isStorageConfigured()) {
    try {
      const url = await uploadImage({
        buffer,
        contentType: file.type,
        folder,
      });
      return NextResponse.json({ url });
    } catch (err) {
      if (err instanceof StorageError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error("[upload] storage upload failed:", err);
      return NextResponse.json(
        { error: "Upload failed. See server logs." },
        { status: 500 },
      );
    }
  }

  // --- Dev fallback: local disk (non-production) ---
  const ext = DEV_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  const filename = `${Date.now()}-${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return NextResponse.json({ url: `/uploads/${folder}/${filename}` });
}
