import { toZonedTime, fromZonedTime, format as tzFormat } from "date-fns-tz";

const TZ = "Asia/Tokyo";

export function nowJST(): Date {
  return toZonedTime(new Date(), TZ);
}

export function toJST(date: Date): Date {
  return toZonedTime(date, TZ);
}

export function todayStringJST(): string {
  return tzFormat(toZonedTime(new Date(), TZ), "yyyy-MM-dd", { timeZone: TZ });
}

export function formatDateTimeJST(date: Date | null): string {
  if (!date) return "";
  return tzFormat(toZonedTime(date, TZ), "yyyy/MM/dd HH:mm", { timeZone: TZ });
}

export function formatTimeJST(date: Date | null): string {
  if (!date) return "--:--";
  return tzFormat(toZonedTime(date, TZ), "HH:mm", { timeZone: TZ });
}

export function formatDateJST(date: Date | null): string {
  if (!date) return "";
  return tzFormat(toZonedTime(date, TZ), "yyyy/MM/dd", { timeZone: TZ });
}

/** Parse "HH:mm" on a given date string (YYYY-MM-DD) in JST, return UTC Date */
export function parseTimeOnDate(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const localDt = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  return fromZonedTime(localDt, TZ);
}

/** Calculate work minutes (clockOut - clockIn in minutes) */
export function calcWorkMinutes(
  clockIn: Date,
  clockOut: Date
): number {
  return Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);
}

/** Auto-calculate required break minutes based on work duration */
export function calcRequiredBreak(workMinutes: number): number {
  if (workMinutes >= 480) return 60; // 8h+ → 60min
  if (workMinutes >= 360) return 45; // 6h+ → 45min
  return 0;
}

/** Get closing period date range for a given reference date */
export function getClosingPeriod(
  referenceDate: Date,
  closingDay: number
): { start: string; end: string } {
  const jst = toZonedTime(referenceDate, TZ);
  const year = jst.getFullYear();
  const month = jst.getMonth() + 1;
  const day = jst.getDate();

  let endYear: number;
  let endMonth: number;

  if (day <= closingDay) {
    endYear = year;
    endMonth = month;
  } else {
    endYear = month === 12 ? year + 1 : year;
    endMonth = month === 12 ? 1 : month + 1;
  }

  const endDay = Math.min(closingDay, daysInMonth(endYear, endMonth));
  const endDateObj = new Date(endYear, endMonth - 1, endDay);

  const startDateObj = new Date(endDateObj);
  startDateObj.setMonth(startDateObj.getMonth() - 1);
  startDateObj.setDate(startDateObj.getDate() + 1);

  return {
    start: tzFormat(startDateObj, "yyyy-MM-dd"),
    end: tzFormat(endDateObj, "yyyy-MM-dd"),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
