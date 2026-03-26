"use client";

import { useState, useEffect } from "react";

type Employee = {
  id: number;
  employeeCode: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({ employeeCode: "", name: "", pin: "" });
  const [error, setError] = useState("");
  const [qrTarget, setQrTarget] = useState<Employee | null>(null);

  const fetchEmployees = async () => {
    const res = await fetch("/api/admin/employees");
    const data = await res.json();
    setEmployees(data.employees);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setForm({ employeeCode: "", name: "", pin: "" });
    setShowForm(false);
    fetchEmployees();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setError("");
    const payload: Record<string, unknown> = { name: form.name };
    if (form.pin) payload.pin = form.pin;
    const res = await fetch(`/api/admin/employees/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setEditTarget(null);
    fetchEmployees();
  };

  const handleToggleActive = async (emp: Employee) => {
    await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !emp.isActive }),
    });
    fetchEmployees();
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({ employeeCode: emp.employeeCode, name: emp.name, pin: "" });
    setError("");
  };

  if (loading) return <p className="text-center text-gray-400 mt-10">読み込み中...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">従業員管理</h1>
        <button
          onClick={() => { setShowForm(true); setForm({ employeeCode: "", name: "", pin: "" }); setError(""); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
        >
          + 従業員追加
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="font-bold text-gray-700 mb-4">新規従業員登録</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">社員コード</label>
              <input
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                placeholder="E001"
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">氏名</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="山田 太郎"
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">初期PIN（4桁以上）</label>
              <input
                type="password"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                placeholder="****"
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              />
            </div>
            {error && <p className="col-span-3 text-red-500 text-sm">{error}</p>}
            <div className="col-span-3 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">登録</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* 編集フォーム */}
      {editTarget && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="font-bold text-gray-700 mb-4">{editTarget.name} を編集</h2>
          <form onSubmit={handleUpdate} className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">社員コード（変更不可）</label>
              <input value={editTarget.employeeCode} disabled className="w-full border rounded-lg p-2 text-sm bg-gray-50 text-gray-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">氏名</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">新しいPIN（変更する場合のみ）</label>
              <input
                type="password"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                placeholder="空白のままで変更なし"
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            {error && <p className="col-span-3 text-red-500 text-sm">{error}</p>}
            <div className="col-span-3 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">更新</button>
              <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* QRコードモーダル */}
      {qrTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQrTarget(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-1">{qrTarget.name}</h3>
            <p className="text-xs text-gray-400 mb-4">{qrTarget.employeeCode}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qrcode/${qrTarget.id}`}
              alt="QR Code"
              className="mx-auto border rounded-lg w-64 h-64"
            />
            <p className="text-xs text-gray-400 mt-3">印刷してご利用ください</p>
            <button
              onClick={() => window.open(`/api/qrcode/${qrTarget.id}`, "_blank")}
              className="mt-3 w-full py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
            >
              別タブで開く（印刷用）
            </button>
            <button onClick={() => setQrTarget(null)} className="mt-2 w-full py-2 text-sm text-gray-400">閉じる</button>
          </div>
        </div>
      )}

      {/* 従業員一覧 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">社員コード</th>
              <th className="px-4 py-3 text-left">氏名</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((emp) => (
              <tr key={emp.id} className={emp.isActive ? "" : "opacity-50"}>
                <td className="px-4 py-3 font-mono">{emp.employeeCode}</td>
                <td className="px-4 py-3">{emp.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${emp.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {emp.isActive ? "在籍" : "退職"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setQrTarget(emp)} className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">QR</button>
                    <button onClick={() => openEdit(emp)} className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">編集</button>
                    <button onClick={() => handleToggleActive(emp)} className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                      {emp.isActive ? "無効化" : "有効化"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
