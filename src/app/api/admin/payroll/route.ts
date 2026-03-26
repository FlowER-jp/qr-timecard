import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  const payrolls = await prisma.payroll.findMany({
    where: employeeId ? { employeeId: Number(employeeId) } : {},
    include: { employee: { select: { id: true, name: true, employeeCode: true } } },
    orderBy: [{ periodStart: "desc" }, { employee: { employeeCode: "asc" } }],
  });

  return NextResponse.json({ payrolls });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, periodStart, periodEnd, workMinutes, baseAmount, nightMinutes, nightAmount, incentive, note } =
    await req.json();

  const totalAmount = Number(baseAmount) + Number(nightAmount ?? 0) + Number(incentive ?? 0);

  const payroll = await prisma.payroll.upsert({
    where: { employeeId_periodStart_periodEnd: { employeeId: Number(employeeId), periodStart, periodEnd } },
    update: { workMinutes, baseAmount, nightMinutes: nightMinutes ?? 0, nightAmount: nightAmount ?? 0, incentive: incentive ?? 0, totalAmount, note: note ?? null },
    create: {
      employeeId: Number(employeeId),
      periodStart,
      periodEnd,
      workMinutes,
      baseAmount,
      nightMinutes: nightMinutes ?? 0,
      nightAmount: nightAmount ?? 0,
      incentive: incentive ?? 0,
      totalAmount,
      note: note ?? null,
    },
  });

  return NextResponse.json({ ok: true, payroll });
}
