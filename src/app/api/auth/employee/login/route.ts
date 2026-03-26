import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { employeeCode, pin, rememberMe } = await req.json();

  const employee = await prisma.employee.findUnique({
    where: { employeeCode: String(employeeCode).toUpperCase() },
  });

  if (!employee || !employee.isActive) {
    return NextResponse.json({ error: "社員コードまたはPINが正しくありません" }, { status: 401 });
  }

  const valid = await bcrypt.compare(pin, employee.pin);
  if (!valid) {
    return NextResponse.json({ error: "社員コードまたはPINが正しくありません" }, { status: 401 });
  }

  const payload = {
    role: "employee" as const,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    name: employee.name,
  };

  const sessionToken = await signToken(payload);

  const res = NextResponse.json({
    ok: true,
    employee: {
      id: employee.id,
      name: employee.name,
      employeeCode: employee.employeeCode,
    },
  });

  // 通常セッション（12時間）
  res.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });

  // 端末を記憶（30日間）
  if (rememberMe) {
    const rememberToken = await signToken(payload, "30d");
    res.cookies.set("remember_employee", rememberToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return res;
}
