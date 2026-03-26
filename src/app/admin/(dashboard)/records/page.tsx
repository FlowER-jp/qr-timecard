"use client";

import { useState, useEffect, useCallback } from "react";

type Employee = { id: number; name: string; employeeCode: string };
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

function calcNet(record: TimeRecord): string {
  if (!record.clockIn || !record.clockOut) return "-";
  const mins = Math.floor((new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 60000) - record.breakMinutes;
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

  useEffect(() => {
    fetch("/api/admin/employees").then(r => r.json()).then(d => setEmployees(d.employees));
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      setClosingDay(d.closingDay);
      // Set current period
      const today = new Date();
      const { start: s, end: e } = getClosingPeriod(today, d.closingDay);
      setStart(s);
      setEnd(e);
    });
  }, []);

  function getClosingPeriod(date: Date, day: number) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const d = date.getDate();
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
    return {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    };
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
  }, [start, end, filterEmployee]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const prevPeriod = () => {
    const s = new Date(start);
    s.setDate(s.getDate() - 1);
    const { start: ns, end: ne } = getClosingPeriod(s, closingDay);
    setStart(ns);
    setEnd(ne);
  };

  const nextPeriod = () => {
    const e = new Date(end);
    e.setDate(e.getDate() + 1);
    const { start: ns, end: ne } = getClosingPeriod(e, closingDay);
    setStart(ns);
    setEnd(ne);
  };

  const toggleCorrections = (id: number) => {
    setExpandedCorrections(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Calculate totals per employee
  const totals = employees.reduce<{ [key: string]: number }>((acc, emp) => {
    const empRecords = records.filter(r => r.employee.id === emp.id);
    const totalMins = empRecords.reduce((sum, r) => {
      if (!r.clockIn || !r.clockOut) return sum;
      return sum + Math.floor((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 60000) - r.breakMinutes;
    }, 0);
    acc[emp.id] = totalMins;
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

      {/* 集計サマリー */}
      {!filterEmployee && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-600 mb-3">期間合計</h2>
          <div className="flex flex-wrap gap-4">
            {employees.filter(e => totals[e.id] !== undefined && totals[e.id] > 0).map(e => (
              <div key={e.id} className="text-center">
                <div className="text-xs text-gray-500">{e.name}</div>
                <div className="text-lg font-bold text-gray-800">
                  {Math.floor(totals[e.id] / 60)}h{totals[e.id] % 60 > 0 ? (totals[e.id] % 60) + "m" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 勤怠レコード */}
      {loading ? (
        <p className="text-center text-gray-400">読み込み中...</p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="text-sm text-gray-500 w-24">{record.date}</div>
                <div className="font-medium text-gray-800 w-28">{record.employee.name}</div>
                <div className="text-sm text-gray-600 flex gap-4">
                  <span>出勤: {formatTime(record.clockIn)}</span>
                  <span>退勤: {formatTime(record.clockOut)}</span>
                  <span>休憩: {record.breakMinutes}分</span>
                  <span className="font-medium text-blue-600">実働: {calcNet(record)}</span>
                </div>
                {record.dailyReport && (
                  <div className="text-xs text-gray-400 truncate max-w-xs ml-auto" title={record.dailyReport}>
                    📝 {record.dailyReport}
                  </div>
                )}
                {record.corrections.length > 0 && (
                  <button
                    onClick={() => toggleCorrections(record.id)}
                    className="ml-auto text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg hover:bg-orange-100"
                  >
                    修正履歴 ({record.corrections.length})
                  </button>
                )}
              </div>
              {expandedCorrections.includes(record.id) && (
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
