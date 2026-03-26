import { NextResponse } from "next/server";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "NOT SET";
  const masked = dbUrl.replace(/:([^:@]+)@/, ':***@');
  
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$disconnect();
    return NextResponse.json({ connected: true, url: masked });
  } catch (e) {
    return NextResponse.json({ 
      connected: false, 
      url: masked,
      error: e instanceof Error ? e.message : String(e)
    });
  }
}
