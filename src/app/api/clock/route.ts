import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/auth";
import {
  todayStringJST,
  calcWorkMinutes,
  calcRequiredBreak,
} from "@/lib/timeUtils";

// GET: get today's status
export async function GET() {
  const session = await getEmployeeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayStringJST();
  const record = await prisma.timeRecord.findUnique({
    where: { employeeId_date: { employeeId: session.employeeId, date: today } },
  });

  return NextResponse.json({ record });
}

// POST: clock in or clock out
export async function POST(req: NextRequest) {
  const session = await getEmployeeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, dailyReport } = await req.json();
  const now = new Date();
  const today = todayStringJST();

  const existing = await prisma.timeRecord.findUnique({
    where: { employeeId_date: { employeeId: session.employeeId, date: today } },
  });

  if (action === "clockIn") {
    if (existing?.clockIn) {
      return NextResponse.json({ error: "本日はすでに出勤済みです" }, { status: 400 });
    }

    const record = existing
      ? await prisma.timeRecord.update({
          where: { id: existing.id },
          data: { clockIn: now },
        })
      : await prisma.timeRecord.create({
          data: {
            employeeId: session.employeeId,
            date: today,
            clockIn: now,
          },
        });

    return NextResponse.json({ ok: true, record });
  }

  if (action === "clockOut") {
    if (!existing?.clockIn) {
      return NextResponse.json({ error: "出勤記録がありません" }, { status: 400 });
    }
    if (existing.clockOut) {
      return NextResponse.json({ error: "本日はすでに退勤済みです" }, { status: 400 });
    }

    const workMinutes = calcWorkMinutes(existing.clockIn, now);
    const autoBreak = calcRequiredBreak(workMinutes);

    const record = await prisma.timeRecord.update({
      where: { id: existing.id },
      data: {
        clockOut: now,
        breakMinutes: autoBreak,
        dailyReport: dailyReport ?? null,
      },
    });

    return NextResponse.json({ ok: true, record, autoBreak });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
