import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    orderBy: { employeeCode: "asc" },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      employeeType: true,
      hourlyWage: true,
      monthlyWage: true,
      scheduledHoursPerMonth: true,
      nightShiftEnabled: true,
      overtimeEnabled: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { employeeCode, name, pin, employeeType, hourlyWage, monthlyWage, scheduledHoursPerMonth, nightShiftEnabled, overtimeEnabled } = await req.json();

    if (!employeeCode || !name || !pin) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (pin.length < 4) {
      return NextResponse.json({ error: "PINは4桁以上で設定してください" }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({ where: { employeeCode } });
    if (existing) {
      return NextResponse.json({ error: "社員コードが重複しています" }, { status: 400 });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        name,
        pin: hashedPin,
        employeeType: employeeType ?? "hourly",
        hourlyWage: hourlyWage ? Number(hourlyWage) : null,
        monthlyWage: monthlyWage ? Number(monthlyWage) : null,
        scheduledHoursPerMonth: scheduledHoursPerMonth ? Number(scheduledHoursPerMonth) : null,
        nightShiftEnabled: !!nightShiftEnabled,
        overtimeEnabled: !!overtimeEnabled,
      },
    });

    return NextResponse.json({ ok: true, employee });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
