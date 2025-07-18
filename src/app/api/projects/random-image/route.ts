import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || "business office workspace"
    const orientation = searchParams.get("orientation") || "landscape"

    const pexelsApiKey = process.env.PEXELS_API_KEY

    // If no API key, return a fallback placeholder image
    if (!pexelsApiKey || pexelsApiKey === "your-pexels-api-key-here") {
      const fallbackImages = [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&h=600&fit=crop"
      ]

      const randomIndex = Math.floor(Math.random() * fallbackImages.length)

      return NextResponse.json({
        id: `fallback-${randomIndex}`,
        url: fallbackImages[randomIndex],
        originalUrl: fallbackImages[randomIndex],
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

    return NextResponse.json({
      id: selectedPhoto.id,
      url: selectedPhoto.src.medium,
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
