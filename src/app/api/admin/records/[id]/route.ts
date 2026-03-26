import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { parseTimeOnDate, calcWorkMinutes, calcRequiredBreak } from "@/lib/timeUtils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recordId = Number(id);
  const { clockInTime, clockOutTime, breakMinutes, dailyReport, reason } = await req.json();

  const record = await prisma.timeRecord.findUnique({ where: { id: recordId } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newClockIn = clockInTime ? parseTimeOnDate(record.date, clockInTime) : record.clockIn;
  const newClockOut = clockOutTime ? parseTimeOnDate(record.date, clockOutTime) : record.clockOut;

  let newBreak = breakMinutes !== undefined ? Number(breakMinutes) : record.breakMinutes;
  if (newClockIn && newClockOut) {
    const required = calcRequiredBreak(calcWorkMinutes(newClockIn, newClockOut));
    if (newBreak < required) newBreak = required;
  }

  await prisma.timeCorrection.create({
    data: {
      timeRecordId: recordId,
      employeeId: record.employeeId,
      prevClockIn: record.clockIn,
      prevClockOut: record.clockOut,
      prevBreakMinutes: record.breakMinutes,
      prevDailyReport: record.dailyReport,
      newClockIn,
      newClockOut,
      newBreakMinutes: newBreak,
      newDailyReport: dailyReport ?? record.dailyReport,
      reason: reason ?? null,
    },
  });

  const updated = await prisma.timeRecord.update({
    where: { id: recordId },
    data: {
      clockIn: newClockIn,
      clockOut: newClockOut,
      breakMinutes: newBreak,
      dailyReport: dailyReport ?? record.dailyReport,
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
      corrections: { orderBy: { correctedAt: "desc" } },
    },
  });

  return NextResponse.json({ ok: true, record: updated });
}
