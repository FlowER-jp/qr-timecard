"use client";

import { useState, useEffect, useCallback } from "react";

type RecordState = {
  id: number;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  dailyReport: string | null;
};

type EmployeeInfo = {
  employeeId: number;
  employeeCode: string;
  name: string;
};

type Step = "loading" | "code" | "pin" | "processing" | "report" | "done_in" | "done_out" | "done_already";

export default function ClockPage() {
  const [step, setStep] = useState<Step>("loading");
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
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
  const formatRecordTime = (t: string | null) => {
    if (!t) return "--:--";
    return new Date(t).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  // 認証後の自動打刻処理
  const processAfterAuth = useCallback(async (emp: EmployeeInfo, existingRecord: RecordState | null) => {
    if (existingRecord?.clockIn && existingRecord?.clockOut) {
      // 本日分完了済み
      setRecord(existingRecord);
      setStep("done_already");
      return;
    }

    if (existingRecord?.clockIn && !existingRecord?.clockOut) {
      // 退勤前 → 日報入力へ
      setRecord(existingRecord);
      setStep("report");
      return;
    }

    // 出勤未記録 → 自動で出勤
    setStep("processing");
    try {
      const res = await fetch("/api/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clockIn" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setStep("code");
        return;
      }
      setRecord(data.record);
      setStep("done_in");
    } catch {
      setError("通信エラーが発生しました");
      setStep("code");
    }
  }, []);

  // 初回マウント：記憶クッキー確認
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/employee/me");
        if (res.ok) {
          const data = await res.json();
          if (data.employee) {
            setEmployee(data.employee);
            await processAfterAuth(data.employee, data.record ?? null);
            return;
          }
        }
      } catch {
        // ignore
      }
      setStep("code");
    })();
  }, [processAfterAuth]);

  // ログイン処理
  const handleLogin = useCallback(async (pinValue: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode, pin: pinValue, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "認証に失敗しました");
        setPin("");
        setLoading(false);
        return;
      }
      const emp: EmployeeInfo = {
        employeeId: data.employee.id,
        employeeCode: data.employee.employeeCode,
        name: data.employee.name,
      };
      setEmployee(emp);

      const recRes = await fetch("/api/clock");
      const recData = await recRes.json();
      setLoading(false);
      await processAfterAuth(emp, recData.record ?? null);
    } catch {
      setError("通信エラーが発生しました");
      setLoading(false);
    }
  }, [employeeCode, rememberMe, processAfterAuth]);

  // PIN 4桁で自動ログイン
  useEffect(() => {
    if (pin.length === 4 && step === "pin") {
      handleLogin(pin);
    }
  }, [pin, step, handleLogin]);

  // 退勤処理
  const handleClockOut = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clockOut", dailyReport }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setRecord(data.record);
      setAutoBreak(data.autoBreak);
      setStep("done_out");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStep("code");
    setEmployeeCode("");
    setPin("");
    setRecord(null);
    setEmployee(null);
    setError("");
    setDailyReport("");
    setAutoBreak(null);
  };

  const handleForget = async () => {
    await fetch("/api/auth/logout?forget=1", { method: "POST" });
    handleReset();
  };

  const PinButton = ({ val }: { val: string }) => (
    <button
      onClick={() => {
        if (val === "←") setPin((p) => p.slice(0, -1));
        else setPin((p) => (p.length < 8 ? p + val : p));
      }}
      className="h-16 rounded-xl bg-gray-100 text-2xl font-semibold text-gray-800 hover:bg-gray-200 active:bg-gray-300 transition select-none"
    >
      {val}
    </button>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">

        {/* 時計（処理中・完了画面以外で表示） */}
        {!["done_in", "done_out", "done_already"].includes(step) && (
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-blue-600 tabular-nums">
              {formatTime(now)}
            </div>
            <div className="text-sm text-gray-500 mt-1">{formatDate(now)}</div>
          </div>
        )}

        {/* ローディング・処理中 */}
        {(step === "loading" || step === "processing") && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-sm">
              {step === "processing" ? "打刻中..." : "確認中..."}
            </p>
          </div>
        )}

        {/* 社員コード入力 */}
        {step === "code" && (
          <div>
            <h2 className="text-center text-lg font-bold text-gray-700 mb-4">
              社員コードを入力
            </h2>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
              placeholder="例: E001"
              autoFocus
              autoCapitalize="characters"
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-blue-400 uppercase mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter" && employeeCode.trim()) {
                  setError(""); setStep("pin"); setPin("");
                }
              }}
            />
            {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
            <button
              onClick={() => {
                if (!employeeCode.trim()) { setError("社員コードを入力してください"); return; }
                setError(""); setStep("pin"); setPin("");
              }}
              className="w-full py-4 rounded-xl bg-blue-500 text-white text-lg font-bold hover:bg-blue-600 active:bg-blue-700 transition"
            >
              次へ
            </button>
          </div>
        )}

        {/* PIN入力 */}
        {step === "pin" && (
          <div>
            <h2 className="text-center text-lg font-bold text-gray-700 mb-1">PINを入力</h2>
            <p className="text-center text-sm text-gray-400 mb-4">{employeeCode}</p>
            <div className="flex justify-center gap-3 mb-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-5 h-5 rounded-full transition-all ${i < pin.length ? "bg-blue-500 scale-110" : "bg-gray-200"}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {["1","2","3","4","5","6","7","8","9","","0","←"].map((v, i) =>
                v === "" ? <div key={i} /> : <PinButton key={i} val={v} />
              )}
            </div>
            <label className="flex items-center gap-2 justify-center cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500"
              />
              <span className="text-sm text-gray-600">このスマホを30日間記憶する</span>
            </label>
            {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
            {loading && <p className="text-gray-400 text-sm text-center">認証中...</p>}
            <button onClick={() => { setStep("code"); setPin(""); setError(""); }}
              className="w-full mt-1 py-2 text-sm text-gray-400 hover:text-gray-600">
              ← 社員コードに戻る
            </button>
          </div>
        )}

        {/* 退勤前の日報入力 */}
        {step === "report" && (
          <div>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-1">{employee?.name}</p>
              <p className="text-xs text-gray-400">
                出勤 {formatRecordTime(record?.clockIn ?? null)}
              </p>
            </div>
            <h2 className="text-center text-lg font-bold text-gray-700 mb-3">
              退勤します
            </h2>
            <textarea
              value={dailyReport}
              onChange={(e) => setDailyReport(e.target.value)}
              placeholder="日報（任意）：本日の作業内容など"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3"
            />
            {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-orange-500 text-white text-lg font-bold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {loading ? "記録中..." : "退勤する"}
            </button>
            <button onClick={handleReset} className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600">
              別の人が使う
            </button>
          </div>
        )}

        {/* 出勤完了 */}
        {step === "done_in" && (
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👍</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{employee?.name}</p>
            <h2 className="text-2xl font-extrabold text-blue-600 mb-2">出勤しました</h2>
            <p className="text-3xl font-bold text-gray-800 tabular-nums mb-6">
              {formatRecordTime(record?.clockIn ?? null)}
            </p>
            <div className="flex justify-center gap-4 text-xs text-gray-300">
              <a href="/employee/history" className="hover:text-blue-400">勤怠履歴・修正</a>
              <button onClick={handleReset} className="hover:text-gray-500">別の人が使う</button>
              <button onClick={handleForget} className="hover:text-gray-500">記憶を削除</button>
            </div>
          </div>
        )}

        {/* 退勤完了 */}
        {step === "done_out" && (
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👋</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{employee?.name}</p>
            <h2 className="text-2xl font-extrabold text-orange-500 mb-2">お疲れさまでした</h2>
            <p className="text-3xl font-bold text-gray-800 tabular-nums mb-1">
              {formatRecordTime(record?.clockOut ?? null)}
            </p>
            <p className="text-xs text-gray-400 mb-1">
              出勤 {formatRecordTime(record?.clockIn ?? null)}
            </p>
            {autoBreak !== null && autoBreak > 0 && (
              <p className="text-xs text-blue-500 mb-4">休憩 {autoBreak}分が自動設定されました</p>
            )}
            <div className="flex justify-center gap-4 text-xs text-gray-300 mt-4">
              <a href="/employee/history" className="hover:text-blue-400">勤怠履歴・修正</a>
              <button onClick={handleReset} className="hover:text-gray-500">別の人が使う</button>
              <button onClick={handleForget} className="hover:text-gray-500">記憶を削除</button>
            </div>
          </div>
        )}

        {/* 本日完了済み */}
        {step === "done_already" && (
          <div className="text-center py-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{employee?.name}</p>
            <h2 className="text-xl font-bold text-gray-700 mb-4">本日の打刻は完了しています</h2>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 mb-6">
              <div>出勤 {formatRecordTime(record?.clockIn ?? null)}</div>
              <div>退勤 {formatRecordTime(record?.clockOut ?? null)}</div>
            </div>
            <div className="flex justify-center gap-4 text-xs text-gray-300">
              <a href="/employee/history" className="hover:text-blue-400">勤怠履歴・修正</a>
              <button onClick={handleReset} className="hover:text-gray-500">別の人が使う</button>
              <button onClick={handleForget} className="hover:text-gray-500">記憶を削除</button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
