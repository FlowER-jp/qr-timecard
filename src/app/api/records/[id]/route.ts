import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/auth";
import { parseTimeOnDate, calcWorkMinutes, calcRequiredBreak } from "@/lib/timeUtils";

// PUT: correct a record
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getEmployeeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recordId = Number(id);
  const body = await req.json();
  const { clockInTime, clockOutTime, breakMinutes, dailyReport, reason } = body;

  const record = await prisma.timeRecord.findUnique({
    where: { id: recordId },
  });

  if (!record || record.employeeId !== session.employeeId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Parse new times
  const newClockIn = clockInTime
    ? parseTimeOnDate(record.date, clockInTime)
    : record.clockIn;
  const newClockOut = clockOutTime
    ? parseTimeOnDate(record.date, clockOutTime)
    : record.clockOut;

  // Auto-calculate break if not manually set
  let newBreak = breakMinutes !== undefined ? Number(breakMinutes) : record.breakMinutes;
  if (newClockIn && newClockOut) {
    const workMin = calcWorkMinutes(newClockIn, newClockOut);
    const required = calcRequiredBreak(workMin);
    if (newBreak < required) newBreak = required;
  }

  // Save correction history
  await prisma.timeCorrection.create({
    data: {
      timeRecordId: recordId,
      employeeId: session.employeeId,
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

  // Update record
  const updated = await prisma.timeRecord.update({
    where: { id: recordId },
    data: {
      clockIn: newClockIn,
      clockOut: newClockOut,
      breakMinutes: newBreak,
      dailyReport: dailyReport ?? record.dailyReport,
    },
    include: { corrections: { orderBy: { correctedAt: "desc" } } },
  });

  return NextResponse.json({ ok: true, record: updated });
}
