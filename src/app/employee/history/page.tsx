"use client";

import { useState, useEffect, useCallback } from "react";

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
  corrections: Correction[];
};

function toTimeInput(dt: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatTime(dt: string | null): string {
  if (!dt) return "--:--";
  return new Date(dt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function calcNet(clockIn: string | null, clockOut: string | null, breakMin: number): string {
  if (!clockIn || !clockOut) return "-";
  const mins = Math.floor((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000) - breakMin;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? m + "m" : ""}`;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    clockInTime: "",
    clockOutTime: "",
    breakMinutes: 0,
    dailyReport: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchRecords = useCallback(async () => {
    const res = await fetch("/api/records");
    const data = await res.json();
    setRecords(data.records);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openEdit = (record: TimeRecord) => {
    setEditId(record.id);
    setEditForm({
      clockInTime: toTimeInput(record.clockIn),
      clockOutTime: toTimeInput(record.clockOut),
      breakMinutes: record.breakMinutes,
      dailyReport: record.dailyReport ?? "",
      reason: "",
    });
    setError("");
  };

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/records/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSaving(false);
      return;
    }
    setEditId(null);
    await fetchRecords();
    setSaving(false);
  };

  if (loading) return <p className="text-gray-400 text-center mt-10">読み込み中...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">勤怠履歴・修正</h1>
      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="bg-white rounded-xl shadow overflow-hidden">
            {editId === record.id ? (
              <div className="p-4">
                <p className="text-sm font-bold text-gray-700 mb-3">{record.date} の修正</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">出勤時刻</label>
                    <input
                      type="time"
                      value={editForm.clockInTime}
                      onChange={e => setEditForm({ ...editForm, clockInTime: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">退勤時刻</label>
                    <input
                      type="time"
                      value={editForm.clockOutTime}
                      onChange={e => setEditForm({ ...editForm, clockOutTime: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">休憩（分）</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.breakMinutes}
                      onChange={e => setEditForm({ ...editForm, breakMinutes: Number(e.target.value) })}
                      className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">修正理由</label>
                    <input
                      value={editForm.reason}
                      onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
                      placeholder="例: 打刻忘れ"
                      className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">日報</label>
                  <textarea
                    value={editForm.dailyReport}
                    onChange={e => setEditForm({ ...editForm, dailyReport: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center px-4 py-3 gap-3 flex-wrap">
                <div className="text-sm font-medium text-gray-600 w-24">{record.date}</div>
                <div className="text-sm text-gray-700 flex gap-3">
                  <span>出勤: {formatTime(record.clockIn)}</span>
                  <span>退勤: {formatTime(record.clockOut)}</span>
                  <span>休憩: {record.breakMinutes}分</span>
                  <span className="font-medium text-blue-600">
                    実働: {calcNet(record.clockIn, record.clockOut, record.breakMinutes)}
                  </span>
                </div>
                <div className="ml-auto flex gap-2 items-center">
                  {record.corrections.length > 0 && (
                    <button
                      onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                      className="text-xs text-orange-500"
                    >
                      修正{record.corrections.length}件
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(record)}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    修正
                  </button>
                </div>
                {record.dailyReport && (
                  <div className="w-full text-xs text-gray-400 pl-24 -mt-1">📝 {record.dailyReport}</div>
                )}
              </div>
            )}
            {expandedId === record.id && (
              <div className="border-t bg-orange-50 px-4 py-3">
                <p className="text-xs font-bold text-orange-600 mb-1">修正履歴</p>
                {record.corrections.map(c => (
                  <div key={c.id} className="text-xs text-gray-600 mb-1">
                    <span className="text-gray-400">{new Date(c.correctedAt).toLocaleString("ja-JP")}</span>
                    {" "}
                    <span className="line-through text-red-400">
                      {formatTime(c.prevClockIn)}〜{formatTime(c.prevClockOut)}
                    </span>
                    {" → "}
                    <span className="text-green-600">
                      {formatTime(c.newClockIn)}〜{formatTime(c.newClockOut)}
                    </span>
                    {c.reason && <span className="ml-1 text-gray-400">({c.reason})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {records.length === 0 && (
          <p className="text-center text-gray-400 py-8">勤怠記録がありません</p>
        )}
      </div>
    </div>
  );
}
