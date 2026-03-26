// Japanese labor law premiums:
// Night shift (深夜割増): 22:00-05:00 JST, +25%
// Daily overtime (日次残業割増): >8h/day, +25%
// Weekly overtime (週次残業割増): >40h/week (hours not already counted as daily OT), +25%
// High overtime (月60h超割増): total OT > 60h/month, additional +25% on excess hours
// Night + overtime are cumulative: 1.5x total (correct per law)

function calcNightMinutesGross(clockIn: Date, clockOut: Date): number {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const inMinsJST = (clockIn.getTime() + JST_OFFSET_MS) / 60000;
  const outMinsJST = (clockOut.getTime() + JST_OFFSET_MS) / 60000;

  let nightMins = 0;
  const startDay = Math.floor(inMinsJST / 1440);
  const endDay = Math.floor(outMinsJST / 1440);

  for (let day = startDay; day <= endDay; day++) {
    const segA = [day * 1440, day * 1440 + 5 * 60];
    const segB = [day * 1440 + 22 * 60, day * 1440 + 24 * 60];
    for (const [sStart, sEnd] of [segA, segB]) {
      const overlapStart = Math.max(inMinsJST, sStart);
      const overlapEnd = Math.min(outMinsJST, sEnd);
      if (overlapEnd > overlapStart) nightMins += overlapEnd - overlapStart;
    }
  }
  return nightMins;
}

// Returns ISO week Monday date string (YYYY-MM-DD) for grouping
function getWeekStart(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dow = (d.getDay() + 6) % 7; // 0=Monday
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface PayrollBreakdown {
  netMinutes: number;
  normalMinutes: number;
  nightMinutes: number;
  overtimeMinutes: number;      // daily + weekly OT combined
  weeklyOvertimeMinutes: number; // portion that's weekly (for display)
  highOvertimeMinutes: number;  // OT beyond 60h/month
  baseAmount: number;
  nightPremiumAmount: number;
  overtimePremiumAmount: number;      // all OT at +25%
  highOvertimePremiumAmount: number;  // extra +25% on OT beyond 60h
  totalBeforeIncentive: number;
}

/**
 * @param records       Time records with optional date field (needed for weekly OT)
 * @param effectiveHourlyRate  hourlyWage for hourly, or monthlyWage/scheduledHours for monthly
 * @param fixedBaseAmount      Monthly employee: set to monthlyWage; hourly: null
 */
export function calcPayrollBreakdown(
  records: Array<{ clockIn: string | null; clockOut: string | null; breakMinutes: number; date?: string }>,
  effectiveHourlyRate: number,
  nightShiftEnabled: boolean,
  overtimeEnabled: boolean,
  fixedBaseAmount: number | null = null
): PayrollBreakdown {
  // Per-record calculations
  const perRecord = records
    .filter(r => r.clockIn && r.clockOut)
    .map(r => {
      const inDate = new Date(r.clockIn!);
      const outDate = new Date(r.clockOut!);
      const grossMins = (outDate.getTime() - inDate.getTime()) / 60000;
      const netMins = Math.max(0, grossMins - r.breakMinutes);
      const dailyOvertimeMins = overtimeEnabled ? Math.max(0, netMins - 480) : 0;
      const regularMins = netMins - dailyOvertimeMins; // min(netMins, 480)
      const grossNight = nightShiftEnabled ? calcNightMinutesGross(inDate, outDate) : 0;
      const nightNetMins = grossMins > 0 ? (grossNight / grossMins) * netMins : 0;
      return { date: r.date, netMins, dailyOvertimeMins, regularMins, nightNetMins };
    });

  // Weekly overtime: hours beyond 40h/week that aren't already daily OT
  let weeklyOvertimeMinutes = 0;
  if (overtimeEnabled) {
    const weekMap = new Map<string, number>();
    for (const rec of perRecord) {
      const key = rec.date ? getWeekStart(rec.date) : "unknown";
      weekMap.set(key, (weekMap.get(key) ?? 0) + rec.regularMins);
    }
    for (const weekRegular of weekMap.values()) {
      weeklyOvertimeMinutes += Math.max(0, weekRegular - 2400); // 40h = 2400 mins
    }
  }

  const netMinutes = Math.round(perRecord.reduce((s, r) => s + r.netMins, 0));
  const nightMinutes = Math.round(perRecord.reduce((s, r) => s + r.nightNetMins, 0));
  const dailyOvertimeTotal = Math.round(perRecord.reduce((s, r) => s + r.dailyOvertimeMins, 0));
  weeklyOvertimeMinutes = Math.round(weeklyOvertimeMinutes);

  const overtimeMinutes = dailyOvertimeTotal + weeklyOvertimeMinutes;
  const normalMinutes = netMinutes - nightMinutes - overtimeMinutes;

  // 60h+ high overtime premium (月60時間超割増)
  const HIGH_OT_THRESHOLD = 60 * 60; // 3600 minutes
  const highOvertimeMinutes = overtimeEnabled ? Math.max(0, overtimeMinutes - HIGH_OT_THRESHOLD) : 0;
  const regularOvertimeMinutes = overtimeMinutes - highOvertimeMinutes;

  const baseAmount = fixedBaseAmount !== null
    ? fixedBaseAmount
    : Math.floor((netMinutes / 60) * effectiveHourlyRate);

  const nightPremiumAmount = nightShiftEnabled
    ? Math.floor((nightMinutes / 60) * effectiveHourlyRate * 0.25)
    : 0;
  // All overtime at +25%
  const overtimePremiumAmount = overtimeEnabled
    ? Math.floor((regularOvertimeMinutes / 60) * effectiveHourlyRate * 0.25)
      + Math.floor((highOvertimeMinutes / 60) * effectiveHourlyRate * 0.25)
    : 0;
  // Extra +25% on the >60h portion (total 50% for those hours)
  const highOvertimePremiumAmount = overtimeEnabled
    ? Math.floor((highOvertimeMinutes / 60) * effectiveHourlyRate * 0.25)
    : 0;

  return {
    netMinutes,
    normalMinutes,
    nightMinutes,
    overtimeMinutes,
    weeklyOvertimeMinutes,
    highOvertimeMinutes,
    baseAmount,
    nightPremiumAmount,
    overtimePremiumAmount,
    highOvertimePremiumAmount,
    totalBeforeIncentive: baseAmount + nightPremiumAmount + overtimePremiumAmount + highOvertimePremiumAmount,
  };
}
