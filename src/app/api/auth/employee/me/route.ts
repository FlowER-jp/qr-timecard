import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayStringJST } from "@/lib/timeUtils";

export async function GET() {
  const cookieStore = await cookies();

  // まず通常セッションを確認
  const sessionToken = cookieStore.get("session")?.value;
  if (sessionToken) {
    const payload = await verifyToken(sessionToken);
    if (payload && payload.role === "employee") {
      const today = todayStringJST();
      const record = await prisma.timeRecord.findUnique({
        where: { employeeId_date: { employeeId: payload.employeeId, date: today } },
      });
      return NextResponse.json({ employee: payload, record });
    }
  }

  // 次に remember_employee クッキーを確認
  const rememberToken = cookieStore.get("remember_employee")?.value;
  if (rememberToken) {
    const payload = await verifyToken(rememberToken);
    if (payload && payload.role === "employee") {
      // 従業員がまだ有効か確認
      const employee = await prisma.employee.findUnique({
        where: { id: payload.employeeId },
        select: { id: true, isActive: true },
      });
      if (employee?.isActive) {
        // 通常セッションを再発行
        const newSession = await signToken(payload);
        const today = todayStringJST();
        const record = await prisma.timeRecord.findUnique({
          where: { employeeId_date: { employeeId: payload.employeeId, date: today } },
        });
        const res = NextResponse.json({ employee: payload, record });
        res.cookies.set("session", newSession, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 12,
          path: "/",
        });
        return res;
      }
    }
  }

  return NextResponse.json({ employee: null }, { status: 401 });
}
