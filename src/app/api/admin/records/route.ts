import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const employeeId = searchParams.get("employeeId");

  const records = await prisma.timeRecord.findMany({
    where: {
      ...(employeeId ? { employeeId: Number(employeeId) } : {}),
      ...(start && end ? { date: { gte: start, lte: end } } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
      corrections: { orderBy: { correctedAt: "desc" } },
    },
    orderBy: [{ date: "asc" }, { employee: { employeeCode: "asc" } }],
  });

  return NextResponse.json({ records });
}
