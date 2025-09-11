import { NextResponse } from "next/server"
import { PrismaClient } from "@/repository/prisma"

export async function GET() {
  try {
    const prisma = new PrismaClient()
    
    // Query the database directly
    const sessions = await prisma.uploadSession.findMany({
      take: 10,
      include: { jobs: true },
      orderBy: { createdAt: "desc" }
    })
    
    console.log(`API: Found ${sessions.length} upload sessions`)
    
    return NextResponse.json({ 
      success: true, 
      count: sessions.length,
      sessions 
    })
  } catch (error) {
    console.error("API: Error fetching upload sessions:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
