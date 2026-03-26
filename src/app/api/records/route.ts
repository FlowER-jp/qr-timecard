import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/auth";

// GET: employee's own records
export async function GET(req: NextRequest) {
  const session = await getEmployeeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const records = await prisma.timeRecord.findMany({
    where: {
      employeeId: session.employeeId,
      ...(start && end ? { date: { gte: start, lte: end } } : {}),
    },
    include: { corrections: { orderBy: { correctedAt: "desc" } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ records });
}
