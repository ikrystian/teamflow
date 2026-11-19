import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import { join } from "path"
import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"

// Bez SVG: pliki z uploads/ są serwowane publicznie z domeny aplikacji.
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
}
const MAX_SIZE = 5 * 1024 * 1024

// POST /api/admin/changelog/images - obrazek do treści wpisu changelogu (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const file = (await request.formData()).get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nie przesłano pliku" }, { status: 400 })
    }
    const extension = EXTENSIONS[file.type]
    if (!extension) {
      return NextResponse.json({ error: "Dozwolone formaty: PNG, JPG, GIF, WebP" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Plik może mieć najwyżej 5 MB" }, { status: 400 })
    }

    const dir = join(process.cwd(), "uploads", "changelog")
    await mkdir(dir, { recursive: true })
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`
    await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()))

    return NextResponse.json({ url: `/uploads/changelog/${filename}` }, { status: 201 })
  } catch (error) {
    console.error("Error uploading changelog image:", error)
    return NextResponse.json({ error: "Nie udało się przesłać obrazka" }, { status: 500 })
  }
}
