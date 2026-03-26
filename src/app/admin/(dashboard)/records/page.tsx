"use client";

import { useState, useEffect, useCallback } from "react";
import { calcPayrollBreakdown } from "@/lib/payrollCalc";

type Employee = { id: number; name: string; employeeCode: string; employeeType: string; hourlyWage: number | null; monthlyWage: number | null; scheduledHoursPerMonth: number | null; nightShiftEnabled: boolean; overtimeEnabled: boolean };
type Correction = {
  id: number;
  prevClockIn: string | null;
  prevClockOut: string | null;
  prevBreakMinutes: number;
  newClockIn: string | null;
  newClockOut: string | null;
  newBreakMinutes: number;
  reason: string | null;
  correctedAt: string;
};
type TimeRecord = {
  id: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  dailyReport: string | null;
  employee: Employee;
  corrections: Correction[];
};

function formatTime(t: string | null) {
  if (!t) return "--:--";
  return new Date(t).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function toTimeInput(t: string | null): string {
  if (!t) return "";
  return new Date(t).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function calcNetMins(record: TimeRecord): number {
  if (!record.clockIn || !record.clockOut) return 0;
  return Math.max(0, Math.floor((new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 60000) - record.breakMinutes);
}

function fmtMins(mins: number): string {
  if (mins <= 0) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? m + "m" : ""}`;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingDay, setClosingDay] = useState<number>(25);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [expandedCorrections, setExpandedCorrections] = useState<number[]>([]);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ clockInTime: "", clockOutTime: "", breakMinutes: "", dailyReport: "", reason: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Payroll state
  const [incentive, setIncentive] = useState("");
  const [payrollNote, setPayrollNote] = useState("");
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [payrollSaved, setPayrollSaved] = useState(false);

  useEffect(() => {
    // Use cached closingDay so records fetch can start immediately in parallel
    const cachedDay = Number(localStorage.getItem("closingDay") ?? "25") || 25;
    const { start: s, end: e } = getClosingPeriod(new Date(), cachedDay);
    setClosingDay(cachedDay);
    setStart(s);
    setEnd(e);

    Promise.all([
      fetch("/api/admin/employees").then(r => r.json()),
      fetch("/api/admin/settings").then(r => r.json()),
    ]).then(([empData, settingsData]) => {
      setEmployees(empData.employees);
      const actualDay: number = settingsData.closingDay;
      localStorage.setItem("closingDay", String(actualDay));
      if (actualDay !== cachedDay) {
        setClosingDay(actualDay);
        const { start: ns, end: ne } = getClosingPeriod(new Date(), actualDay);
        setStart(ns);
        setEnd(ne);
      }
    });
  }, []);

  function getClosingPeriod(date: Date, day: number) {
    const year = date.getFullYear(), month = date.getMonth() + 1, d = date.getDate();
    let endYear = year, endMonth = month;
    if (d > day) {
      endMonth = month === 12 ? 1 : month + 1;
      endYear = month === 12 ? year + 1 : year;
    }
    const endDay = Math.min(day, new Date(endYear, endMonth, 0).getDate());
    const endDate = new Date(endYear, endMonth - 1, endDay);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(startDate.getDate() + 1);
    return { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
  }

  const fetchRecords = useCallback(async () => {
    if (!start || !end) return;
    setLoading(true);
    const params = new URLSearchParams({ start, end });
    if (filterEmployee) params.set("employeeId", filterEmployee);
    const res = await fetch(`/api/admin/records?${params}`);
    const data = await res.json();
    setRecords(data.records);
    setLoading(false);
    setPayrollSaved(false);
  }, [start, end, filterEmployee]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const prevPeriod = () => {
    const s = new Date(start); s.setDate(s.getDate() - 1);
    const { start: ns, end: ne } = getClosingPeriod(s, closingDay);
    setStart(ns); setEnd(ne);
  };
  const nextPeriod = () => {
    const e = new Date(end); e.setDate(e.getDate() + 1);
    const { start: ns, end: ne } = getClosingPeriod(e, closingDay);
    setStart(ns); setEnd(ne);
  };

  const openEdit = (record: TimeRecord) => {
    setEditId(record.id);
    setEditForm({
      clockInTime: toTimeInput(record.clockIn),
      clockOutTime: toTimeInput(record.clockOut),
      breakMinutes: String(record.breakMinutes),
      dailyReport: record.dailyReport ?? "",
      reason: "",
    });
  };

  const handleEditSubmit = async (recordId: number) => {
    setEditLoading(true);
    const res = await fetch(`/api/admin/records/${recordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const data = await res.json();
      setRecords(prev => prev.map(r => r.id === recordId ? { ...data.record } : r));
      setEditId(null);
    }
    setEditLoading(false);
  };

  const handleSavePayroll = async () => {
    const emp = employees.find(e => String(e.id) === filterEmployee);
    if (!emp || !emp.hourlyWage || !breakdown) return;
    const inc = Number(incentive) || 0;
    setSavingPayroll(true);
    const res = await fetch("/api/admin/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: emp.id,
        periodStart: start,
        periodEnd: end,
        workMinutes: breakdown.netMinutes,
        baseAmount: breakdown.baseAmount,
        nightMinutes: breakdown.nightMinutes,
        nightAmount: breakdown.nightPremiumAmount,
        overtimeMinutes: breakdown.overtimeMinutes,
        overtimeAmount: breakdown.overtimePremiumAmount,
        highOvertimeMinutes: breakdown.highOvertimeMinutes,
        highOvertimeAmount: breakdown.highOvertimePremiumAmount,
        incentive: inc,
        note: payrollNote || null,
      }),
    });
    setSavingPayroll(false);
    if (res.ok) setPayrollSaved(true);
  };

  const selectedEmployee = employees.find(e => String(e.id) === filterEmployee) ?? null;
  const isMonthly = selectedEmployee?.employeeType === "monthly";
  const effectiveHourlyRate = isMonthly
    ? (selectedEmployee!.monthlyWage ?? 0) / (selectedEmployee!.scheduledHoursPerMonth ?? 160)
    : (selectedEmployee?.hourlyWage ?? 0);
  const hasWage = isMonthly ? !!selectedEmployee?.monthlyWage : !!selectedEmployee?.hourlyWage;
  const breakdown = selectedEmployee && hasWage
    ? calcPayrollBreakdown(
        records.map(r => ({ ...r, date: r.date })),
        effectiveHourlyRate,
        selectedEmployee.nightShiftEnabled,
        selectedEmployee.overtimeEnabled,
        isMonthly ? (selectedEmployee.monthlyWage ?? null) : null
      )
    : null;
  const totalMins = breakdown?.netMinutes ?? records.reduce((sum, r) => sum + calcNetMins(r), 0);
  const totalAmount = breakdown ? breakdown.totalBeforeIncentive + (Number(incentive) || 0) : null;

  const totals = employees.reduce<{ [key: string]: number }>((acc, emp) => {
    acc[emp.id] = records.filter(r => r.employee.id === emp.id).reduce((s, r) => s + calcNetMins(r), 0);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">勤怠一覧</h1>

      {/* フィルター */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">期間</label>
          <div className="flex items-center gap-2">
            <button onClick={prevPeriod} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">◀</button>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border rounded-lg p-2 text-sm" />
            <span className="text-gray-400">〜</span>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border rounded-lg p-2 text-sm" />
            <button onClick={nextPeriod} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">▶</button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">従業員</label>
          <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="border rounded-lg p-2 text-sm">
            <option value="">全員</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 全員サマリー */}
      {!filterEmployee && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-600 mb-3">期間合計</h2>
          <div className="flex flex-wrap gap-4">
            {employees.filter(e => totals[e.id] > 0).map(e => (
              <div key={e.id} className="text-center">
                <div className="text-xs text-gray-500">{e.name}</div>
                <div className="text-lg font-bold text-gray-800">{fmtMins(totals[e.id])}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1人選択時の給与計算 */}
      {filterEmployee && selectedEmployee && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-600 mb-3">給与計算</h2>
          <div className="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-gray-500">実働時間</div>
              <div className="text-lg font-bold text-gray-800">{fmtMins(totalMins)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{isMonthly ? "月給 / 残業単価" : "時給"}</div>
              <div className="text-lg font-bold text-gray-800">
                {isMonthly
                  ? selectedEmployee.monthlyWage
                    ? <span>¥{selectedEmployee.monthlyWage.toLocaleString()}<span className="text-xs text-gray-400 ml-1">（残業¥{Math.round(effectiveHourlyRate)}/h）</span></span>
                    : "未設定"
                  : selectedEmployee.hourlyWage
                    ? `¥${selectedEmployee.hourlyWage.toLocaleString()}`
                    : "未設定"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{isMonthly ? "月給（固定）" : "基本給"}</div>
              <div className="text-lg font-bold text-gray-800">
                {breakdown ? `¥${breakdown.baseAmount.toLocaleString()}` : "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">合計</div>
              <div className="text-xl font-extrabold text-blue-600">
                {totalAmount !== null ? `¥${totalAmount.toLocaleString()}` : "-"}
              </div>
            </div>
          </div>
          {breakdown && (breakdown.nightMinutes > 0 || breakdown.overtimeMinutes > 0) && (
            <div className="space-y-1 mb-3">
              {breakdown.nightMinutes > 0 && (
                <div className="bg-purple-50 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium text-purple-700">深夜割増：</span>
                  <span className="text-purple-600 ml-2">
                    {fmtMins(breakdown.nightMinutes)} × +25% ＝ +¥{breakdown.nightPremiumAmount.toLocaleString()}
                  </span>
                </div>
              )}
              {breakdown.overtimeMinutes > 0 && (
                <div className="bg-orange-50 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium text-orange-700">残業割増：</span>
                  <span className="text-orange-600 ml-2">
                    {fmtMins(breakdown.overtimeMinutes)} × +25%
                    {breakdown.weeklyOvertimeMinutes > 0 && (
                      <span className="text-gray-400 ml-1">（うち週次 {fmtMins(breakdown.weeklyOvertimeMinutes)}）</span>
                    )}
                    {" ＝ "}+¥{breakdown.overtimePremiumAmount.toLocaleString()}
                  </span>
                </div>
              )}
              {breakdown.highOvertimeMinutes > 0 && (
                <div className="bg-red-50 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium text-red-700">高残業割増（60h超）：</span>
                  <span className="text-red-600 ml-2">
                    {fmtMins(breakdown.highOvertimeMinutes)} × 追加+25% ＝ +¥{breakdown.highOvertimePremiumAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
          {hasWage ? (
            <div className="border-t pt-3 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-600 mb-1">インセンティブ（円）</label>
                <input
                  type="number"
                  value={incentive}
                  onChange={e => setIncentive(e.target.value)}
                  placeholder="0"
                  className="border rounded-lg p-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">備考</label>
                <input
                  value={payrollNote}
                  onChange={e => setPayrollNote(e.target.value)}
                  placeholder="任意"
                  className="border rounded-lg p-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <button
                onClick={handleSavePayroll}
                disabled={savingPayroll || payrollSaved}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {payrollSaved ? "✓ 確定済み" : savingPayroll ? "保存中..." : "給与を確定"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-orange-500 mt-2">従業員マスタで{isMonthly ? "月給・所定時間" : "時給"}を設定してください</p>
          )}
        </div>
      )}

      {/* 勤怠レコード */}
      {loading ? (
        <p className="text-center text-gray-400">読み込み中...</p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl shadow overflow-hidden">
              {editId === record.id ? (
                <div className="p-4">
                  <p className="text-xs font-bold text-gray-500 mb-3">{record.date} — {record.employee.name}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">出勤時刻</label>
                      <input type="time" value={editForm.clockInTime}
                        onChange={e => setEditForm(f => ({ ...f, clockInTime: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">退勤時刻</label>
                      <input type="time" value={editForm.clockOutTime}
                        onChange={e => setEditForm(f => ({ ...f, clockOutTime: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">休憩（分）</label>
                      <input type="number" value={editForm.breakMinutes}
                        onChange={e => setEditForm(f => ({ ...f, breakMinutes: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">修正理由</label>
                      <input value={editForm.reason}
                        onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                        placeholder="任意"
                        className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-1">日報</label>
                    <input value={editForm.dailyReport}
                      onChange={e => setEditForm(f => ({ ...f, dailyReport: e.target.value }))}
                      className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditSubmit(record.id)} disabled={editLoading}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
                      {editLoading ? "保存中..." : "保存"}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <div className="text-sm text-gray-500 w-24 shrink-0">{record.date}</div>
                  {!filterEmployee && <div className="font-medium text-gray-800 w-24 shrink-0">{record.employee.name}</div>}
                  <div className="text-sm text-gray-600 flex gap-3 flex-wrap">
                    <span>出勤: {formatTime(record.clockIn)}</span>
                    <span>退勤: {formatTime(record.clockOut)}</span>
                    <span>休憩: {record.breakMinutes}分</span>
                    <span className="font-medium text-blue-600">実働: {fmtMins(calcNetMins(record))}</span>
                  </div>
                  {record.dailyReport && (
                    <div className="text-xs text-gray-400 truncate max-w-xs" title={record.dailyReport}>
                      📝 {record.dailyReport}
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {record.corrections.length > 0 && (
                      <button
                        onClick={() => setExpandedCorrections(prev =>
                          prev.includes(record.id) ? prev.filter(x => x !== record.id) : [...prev, record.id]
                        )}
                        className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg hover:bg-orange-100"
                      >
                        修正履歴 ({record.corrections.length})
                      </button>
                    )}
                    <button onClick={() => openEdit(record)}
                      className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100">
                      編集
                    </button>
                  </div>
                </div>
              )}
              {expandedCorrections.includes(record.id) && editId !== record.id && (
                <div className="border-t bg-orange-50 px-4 py-3">
                  <p className="text-xs font-bold text-orange-600 mb-2">修正履歴</p>
                  <div className="space-y-2">
                    {record.corrections.map((c) => (
                      <div key={c.id} className="text-xs text-gray-600">
                        <span className="text-gray-400">{new Date(c.correctedAt).toLocaleString("ja-JP")}</span>
                        {" | "}
                        <span className="line-through text-red-400">
                          {formatTime(c.prevClockIn)} → {formatTime(c.prevClockOut)} (休{c.prevBreakMinutes}分)
                        </span>
                        {" → "}
                        <span className="text-green-600">
                          {formatTime(c.newClockIn)} → {formatTime(c.newClockOut)} (休{c.newBreakMinutes}分)
                        </span>
                        {c.reason && <span className="ml-2 text-gray-500">理由: {c.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {records.length === 0 && (
            <p className="text-center text-gray-400 py-8">該当するレコードがありません</p>
          )}
        </div>
      )}
    </div>
  );
}
