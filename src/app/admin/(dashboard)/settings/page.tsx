"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [closingDay, setClosingDay] = useState(25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => { setClosingDay(d.closingDay); setLoading(false); });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingDay }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); }
    else { setMessage("設定を保存しました"); }
    setSaving(false);
  };

  if (loading) return <p className="text-gray-400">読み込み中...</p>;

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-gray-800 mb-6">設定</h1>
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-bold text-gray-700 mb-4">給与計算締日</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">締日（毎月）</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={28}
                value={closingDay}
                onChange={(e) => setClosingDay(Number(e.target.value))}
                className="w-24 border rounded-lg p-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <span className="text-gray-600">日</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">1〜28の範囲で設定してください（月末指定は28日）</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mt-4">
        <h2 className="font-bold text-gray-700 mb-2">休憩時間の自動付与ルール</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 実働 6時間以上 → 45分の休憩を自動付与</li>
          <li>• 実働 8時間以上 → 60分の休憩を自動付与</li>
          <li className="text-xs text-gray-400 mt-2">※ 従業員が手動で設定した休憩時間が上記より少ない場合のみ適用</li>
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mt-4 text-center">
        <h2 className="font-bold text-gray-700 mb-1">会社用QRコード</h2>
        <p className="text-xs text-gray-400 mb-4">このQRを印刷して掲示してください。従業員がスキャンすると打刻画面が開きます。</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/qrcode/company"
          alt="会社QRコード"
          className="mx-auto border rounded-xl w-64 h-64"
        />
        <button
          onClick={() => window.open("/api/qrcode/company/print", "_blank")}
          className="mt-3 w-full py-2 bg-blue-500 rounded-lg text-sm text-white font-medium hover:bg-blue-600"
        >
          印刷用ページを開く
        </button>
      </div>
    </div>
  );
}
