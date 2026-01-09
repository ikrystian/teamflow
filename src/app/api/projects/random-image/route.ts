import { NextRequest, NextResponse } from "next/server"

// Helper function to convert image URL to base64
async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString('base64')

  // Get content type from response header
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  return `data:${contentType};base64,${base64}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || "business office workspace"
    const orientation = searchParams.get("orientation") || "landscape"

    const pexelsApiKey = process.env.PEXELS_API_KEY

    // If no API key, return a fallback placeholder image (full resolution)
    if (!pexelsApiKey || pexelsApiKey === "your-pexels-api-key-here") {
      const fallbackImages = [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=90",
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1920&q=90",
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1920&q=90",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=90",
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1920&q=90"
      ]

      const randomIndex = Math.floor(Math.random() * fallbackImages.length)
      const imageUrl = fallbackImages[randomIndex]

      // Convert to base64 to avoid CORS issues during cropping
      const base64Url = await imageUrlToBase64(imageUrl)

      return NextResponse.json({
        id: `fallback-${randomIndex}`,
        url: base64Url,
        originalUrl: imageUrl,
        photographer: "Unsplash",
        photographerUrl: "https://unsplash.com",
        alt: query,
      })
    }

    // Fetch random image from Pexels
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=20&page=1`,
      {
        headers: {
          Authorization: pexelsApiKey,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.photos || data.photos.length === 0) {
      return NextResponse.json(
        { error: "No images found" },
        { status: 404 }
      )
    }

    // Select a random image from the results
    const randomIndex = Math.floor(Math.random() * data.photos.length)
    const selectedPhoto = data.photos[randomIndex]

    // Convert to base64 to avoid CORS issues during cropping (use large2x for high resolution)
    const base64Url = await imageUrlToBase64(selectedPhoto.src.large2x)

    return NextResponse.json({
      id: selectedPhoto.id,
      url: base64Url,
      originalUrl: selectedPhoto.src.original,
      photographer: selectedPhoto.photographer,
      photographerUrl: selectedPhoto.photographer_url,
      alt: selectedPhoto.alt || query,
    })
  } catch (error) {
    console.error("Error fetching random image:", error)
    return NextResponse.json(
      { error: "Failed to fetch random image" },
      { status: 500 }
    )
  }
}
