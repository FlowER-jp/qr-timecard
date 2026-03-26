"use client";

import { useState, useEffect } from "react";

type Employee = {
  id: number;
  employeeCode: string;
  name: string;
  hourlyWage: number | null;
  nightShiftEnabled: boolean;
  overtimeEnabled: boolean;
  isActive: boolean;
  createdAt: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({ employeeCode: "", name: "", pin: "", hourlyWage: "", nightShiftEnabled: false, overtimeEnabled: false });
  const [error, setError] = useState("");

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
    setForm({ employeeCode: "", name: "", pin: "", hourlyWage: "", nightShiftEnabled: false, overtimeEnabled: false });
    setShowForm(false);
    fetchEmployees();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setError("");
    const payload: Record<string, unknown> = { name: form.name, hourlyWage: form.hourlyWage || null, nightShiftEnabled: form.nightShiftEnabled, overtimeEnabled: form.overtimeEnabled };
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

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`「${emp.name}」を削除しますか？\n勤怠記録もすべて削除されます。`)) return;
    const res = await fetch(`/api/admin/employees/${emp.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "削除に失敗しました");
      return;
    }
    setEmployees(prev => prev.filter(e => e.id !== emp.id));
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({ employeeCode: emp.employeeCode, name: emp.name, pin: "", hourlyWage: emp.hourlyWage?.toString() ?? "", nightShiftEnabled: emp.nightShiftEnabled, overtimeEnabled: emp.overtimeEnabled });
    setError("");
  };

  if (loading) return <p className="text-center text-gray-400 mt-10">読み込み中...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">従業員管理</h1>
        <button
          onClick={() => { setShowForm(true); setForm({ employeeCode: "", name: "", pin: "", hourlyWage: "", nightShiftEnabled: false, overtimeEnabled: false }); setError(""); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
        >
          + 従業員追加
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="font-bold text-gray-700 mb-4">新規従業員登録</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-4 gap-3">
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
            <div>
              <label className="block text-xs text-gray-600 mb-1">時給（円）</label>
              <input
                type="number"
                value={form.hourlyWage}
                onChange={(e) => setForm({ ...form, hourlyWage: e.target.value })}
                placeholder="1000"
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="col-span-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.nightShiftEnabled}
                  onChange={(e) => setForm({ ...form, nightShiftEnabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                深夜割増あり（22:00〜05:00 +25%）
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.overtimeEnabled}
                  onChange={(e) => setForm({ ...form, overtimeEnabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                残業割増あり（8時間超 +25%）
              </label>
            </div>
            {error && <p className="col-span-4 text-red-500 text-sm">{error}</p>}
            <div className="col-span-4 flex gap-2">
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
          <form onSubmit={handleUpdate} className="grid grid-cols-4 gap-3">
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
            <div>
              <label className="block text-xs text-gray-600 mb-1">時給（円）</label>
              <input
                type="number"
                value={form.hourlyWage}
                onChange={(e) => setForm({ ...form, hourlyWage: e.target.value })}
                placeholder="1000"
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="col-span-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.nightShiftEnabled}
                  onChange={(e) => setForm({ ...form, nightShiftEnabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                深夜割増あり（22:00〜05:00 +25%）
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.overtimeEnabled}
                  onChange={(e) => setForm({ ...form, overtimeEnabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                残業割増あり（8時間超 +25%）
              </label>
            </div>
            {error && <p className="col-span-4 text-red-500 text-sm">{error}</p>}
            <div className="col-span-4 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">更新</button>
              <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* 従業員一覧 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">社員コード</th>
              <th className="px-4 py-3 text-left">氏名</th>
              <th className="px-4 py-3 text-left">時給</th>
              <th className="px-4 py-3 text-left">深夜割増</th>
              <th className="px-4 py-3 text-left">残業割増</th>
              <th className="px-4 py-3 text-left">状態</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((emp) => (
              <tr key={emp.id} className={emp.isActive ? "" : "opacity-50"}>
                <td className="px-4 py-3 font-mono">{emp.employeeCode}</td>
                <td className="px-4 py-3">{emp.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{emp.hourlyWage ? `¥${emp.hourlyWage.toLocaleString()}` : "-"}</td>
                <td className="px-4 py-3 text-sm">
                  {emp.nightShiftEnabled ? <span className="text-purple-600 font-medium">あり</span> : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {emp.overtimeEnabled ? <span className="text-orange-600 font-medium">あり</span> : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${emp.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {emp.isActive ? "在籍" : "退職"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(emp)} className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">編集</button>
                    <button onClick={() => handleToggleActive(emp)} className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                      {emp.isActive ? "無効化" : "有効化"}
                    </button>
                    <button onClick={() => handleDelete(emp)} className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100">削除</button>
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
