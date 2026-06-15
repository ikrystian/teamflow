import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { existsSync, statSync } from "fs";
import { readFile } from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    
    // Ensure we don't have directory traversal attacks
    if (path.some(p => p.includes(".."))) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    const filePath = join(process.cwd(), "uploads", ...path);

    if (!existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const stat = statSync(filePath);
    if (!stat.isFile()) {
      return new NextResponse("File not found", { status: 404 });
    }

    const file = await readFile(filePath);
    
    // Guess mime type roughly from extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "svg") contentType = "image/svg+xml";
    else if (ext === "webp") contentType = "image/webp";
    else if (ext === "pdf") contentType = "application/pdf";
    else if (ext === "txt") contentType = "text/plain";
    else if (ext === "csv") contentType = "text/csv";
    else if (ext === "json") contentType = "application/json";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
