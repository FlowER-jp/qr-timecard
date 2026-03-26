"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type RecordState = {
  id: number;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  dailyReport: string | null;
};

type Step = "pin" | "action" | "report" | "done";

export default function ClockPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.employeeId as string;

  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [record, setRecord] = useState<RecordState | null>(null);
  const [dailyReport, setDailyReport] = useState("");
  const [autoBreak, setAutoBreak] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (d: Date) =>
    d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const handlePin = useCallback(async () => {
    if (pin.length < 4) {
      setError("PINを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "認証に失敗しました");
        setPin("");
        return;
      }
      setEmployeeName(data.employee.name);
      // Get today's record
      const recRes = await fetch("/api/clock");
      const recData = await recRes.json();
      setRecord(recData.record ?? null);
      setStep("action");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [employeeId, pin]);

  useEffect(() => {
    if (pin.length === 4 && step === "pin") {
      handlePin();
    }
  }, [pin, step, handlePin]);

  const handleClockIn = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clockIn" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setRecord(data.record);
      setStep("done");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!record?.clockIn) return;
    if (!record.clockOut) {
      setStep("report");
      return;
    }
    setError("本日はすでに退勤済みです");
  };

  const handleSubmitReport = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clockOut", dailyReport }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setRecord(data.record);
      setAutoBreak(data.autoBreak);
      setStep("done");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    setStep("pin");
    setPin("");
    setRecord(null);
    setEmployeeName("");
  };

  const formatRecordTime = (t: string | null) => {
    if (!t) return "--:--";
    return new Date(t).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  const PinButton = ({ val }: { val: string }) => (
    <button
      onClick={() => {
        if (val === "←") {
          setPin((p) => p.slice(0, -1));
        } else {
          setPin((p) => (p.length < 8 ? p + val : p));
        }
      }}
      className="h-16 rounded-xl bg-gray-100 text-2xl font-semibold text-gray-800 hover:bg-gray-200 active:bg-gray-300 transition select-none"
    >
      {val}
    </button>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
        {/* Clock */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-blue-600 tabular-nums">
            {formatTime(now)}
          </div>
          <div className="text-sm text-gray-500 mt-1">{formatDate(now)}</div>
        </div>

        {/* PIN入力 */}
        {step === "pin" && (
          <div>
            <h2 className="text-center text-lg font-bold text-gray-700 mb-4">
              PINを入力してください
            </h2>
            <div className="flex justify-center gap-2 mb-4">
              {[...Array(pin.length)].map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-blue-500" />
              ))}
              {[...Array(Math.max(0, 4 - pin.length))].map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-gray-200" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {["1","2","3","4","5","6","7","8","9","","0","←"].map((v, i) =>
                v === "" ? (
                  <div key={i} />
                ) : (
                  <PinButton key={i} val={v} />
                )
              )}
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {loading && <p className="text-gray-400 text-sm text-center">認証中...</p>}
          </div>
        )}

        {/* 出退勤選択 */}
        {step === "action" && (
          <div>
            <h2 className="text-center text-xl font-bold text-gray-800 mb-1">
              {employeeName}
            </h2>
            {record && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 mb-4 text-center">
                <span>出勤: {formatRecordTime(record.clockIn)}</span>
                {record.clockOut && (
                  <span className="ml-3">退勤: {formatRecordTime(record.clockOut)}</span>
                )}
              </div>
            )}
            <div className="space-y-3">
              {!record?.clockIn && (
                <button
                  onClick={handleClockIn}
                  disabled={loading}
                  className="w-full py-5 rounded-xl bg-blue-500 text-white text-xl font-bold hover:bg-blue-600 active:bg-blue-700 transition disabled:opacity-50"
                >
                  出勤
                </button>
              )}
              {record?.clockIn && !record.clockOut && (
                <button
                  onClick={handleClockOut}
                  disabled={loading}
                  className="w-full py-5 rounded-xl bg-orange-500 text-white text-xl font-bold hover:bg-orange-600 active:bg-orange-700 transition disabled:opacity-50"
                >
                  退勤
                </button>
              )}
              {record?.clockIn && record.clockOut && (
                <div className="text-center text-gray-500 py-4">本日の打刻は完了しています</div>
              )}
            </div>
            {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            <button
              onClick={handleLogout}
              className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-gray-600"
            >
              戻る
            </button>
          </div>
        )}

        {/* 日報入力 */}
        {step === "report" && (
          <div>
            <h2 className="text-center text-lg font-bold text-gray-700 mb-4">
              日報（任意）
            </h2>
            <textarea
              value={dailyReport}
              onChange={(e) => setDailyReport(e.target.value)}
              placeholder="本日の作業内容や連絡事項を入力..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={handleSubmitReport}
              disabled={loading}
              className="w-full mt-3 py-4 rounded-xl bg-orange-500 text-white text-lg font-bold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "記録中..." : "退勤する"}
            </button>
            <button
              onClick={() => setStep("action")}
              className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600"
            >
              戻る
            </button>
          </div>
        )}

        {/* 完了 */}
        {step === "done" && (
          <div className="text-center">
            <div className="text-5xl mb-4">
              {record?.clockOut ? "👋" : "👍"}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {record?.clockOut ? "お疲れさまでした！" : "出勤しました！"}
            </h2>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 mb-4">
              <div>出勤: {formatRecordTime(record?.clockIn ?? null)}</div>
              {record?.clockOut && (
                <div>退勤: {formatRecordTime(record.clockOut)}</div>
              )}
              {autoBreak !== null && autoBreak > 0 && (
                <div className="text-blue-600 mt-1">
                  休憩 {autoBreak}分が自動設定されました
                </div>
              )}
            </div>
            <a
              href="/employee/history"
              className="block w-full py-3 rounded-xl bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition mb-2"
            >
              勤怠履歴・修正
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
