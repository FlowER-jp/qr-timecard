import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const empId = Number(id);

  try {
    await prisma.timeCorrection.deleteMany({ where: { employeeId: empId } });
    await prisma.timeRecord.deleteMany({ where: { employeeId: empId } });
    await prisma.employee.delete({ where: { id: empId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, pin, isActive, hourlyWage } = await req.json();

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) data.isActive = isActive;
  if (hourlyWage !== undefined) data.hourlyWage = hourlyWage ? Number(hourlyWage) : null;
  if (pin) {
    if (pin.length < 4) {
      return NextResponse.json({ error: "PINは4桁以上で設定してください" }, { status: 400 });
    }
    data.pin = await bcrypt.hash(pin, 10);
  }

  const employee = await prisma.employee.update({
    where: { id: Number(id) },
    data,
  });

  return NextResponse.json({ ok: true, employee });
}
