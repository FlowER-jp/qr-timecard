// Night shift: 22:00-05:00 JST (+25%)
// Overtime: >8h/day (+25%)
// Night + overtime overlap: cumulative → 1.5x total (both premiums apply independently)

function calcNightMinutesGross(clockIn: Date, clockOut: Date): number {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const inMinsJST = (clockIn.getTime() + JST_OFFSET_MS) / 60000;
  const outMinsJST = (clockOut.getTime() + JST_OFFSET_MS) / 60000;

  let nightMins = 0;
  const startDay = Math.floor(inMinsJST / 1440);
  const endDay = Math.floor(outMinsJST / 1440);

  for (let day = startDay; day <= endDay; day++) {
    const segA = [day * 1440, day * 1440 + 5 * 60];         // 00:00-05:00
    const segB = [day * 1440 + 22 * 60, day * 1440 + 24 * 60]; // 22:00-24:00

    for (const [sStart, sEnd] of [segA, segB]) {
      const overlapStart = Math.max(inMinsJST, sStart);
      const overlapEnd = Math.min(outMinsJST, sEnd);
      if (overlapEnd > overlapStart) nightMins += overlapEnd - overlapStart;
    }
  }

  return nightMins;
}

export interface PayrollBreakdown {
  netMinutes: number;
  normalMinutes: number;
  nightMinutes: number;
  overtimeMinutes: number;
  baseAmount: number;
  nightPremiumAmount: number;
  overtimePremiumAmount: number;
  totalBeforeIncentive: number;
}

export function calcPayrollBreakdown(
  records: Array<{ clockIn: string | null; clockOut: string | null; breakMinutes: number }>,
  hourlyWage: number,
  nightShiftEnabled: boolean,
  overtimeEnabled: boolean
): PayrollBreakdown {
  let netMinutes = 0;
  let nightMinutesFloat = 0;
  let overtimeMinutes = 0;

  for (const r of records) {
    if (!r.clockIn || !r.clockOut) continue;
    const inDate = new Date(r.clockIn);
    const outDate = new Date(r.clockOut);
    const grossMins = (outDate.getTime() - inDate.getTime()) / 60000;
    const netMins = Math.max(0, grossMins - r.breakMinutes);
    netMinutes += netMins;

    if (nightShiftEnabled) {
      const grossNight = calcNightMinutesGross(inDate, outDate);
      // Deduct break proportionally across all hours
      const nightNet = grossMins > 0 ? (grossNight / grossMins) * netMins : 0;
      nightMinutesFloat += nightNet;
    }

    if (overtimeEnabled) {
      // Overtime threshold: 8h = 480 minutes per day
      overtimeMinutes += Math.max(0, netMins - 480);
    }
  }

  netMinutes = Math.round(netMinutes);
  const nightMinutes = Math.round(nightMinutesFloat);
  overtimeMinutes = Math.round(overtimeMinutes);
  const normalMinutes = netMinutes - nightMinutes - overtimeMinutes;

  const baseAmount = Math.floor((netMinutes / 60) * hourlyWage);
  const nightPremiumAmount = nightShiftEnabled
    ? Math.floor((nightMinutes / 60) * hourlyWage * 0.25)
    : 0;
  const overtimePremiumAmount = overtimeEnabled
    ? Math.floor((overtimeMinutes / 60) * hourlyWage * 0.25)
    : 0;

  return {
    netMinutes,
    normalMinutes,
    nightMinutes,
    overtimeMinutes,
    baseAmount,
    nightPremiumAmount,
    overtimePremiumAmount,
    totalBeforeIncentive: baseAmount + nightPremiumAmount + overtimePremiumAmount,
  };
}
