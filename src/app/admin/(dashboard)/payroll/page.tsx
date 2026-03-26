"use client";

import { useState, useEffect, useCallback } from "react";

type Employee = { id: number; name: string; employeeCode: string; hourlyWage: number | null };
type Payroll = {
  id: number;
  periodStart: string;
  periodEnd: string;
  workMinutes: number;
  baseAmount: number;
  nightMinutes: number;
  nightAmount: number;
  overtimeMinutes: number;
  overtimeAmount: number;
  incentive: number;
  totalAmount: number;
  note: string | null;
  createdAt: string;
  employee: { id: number; name: string; employeeCode: string };
};

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}時間${m > 0 ? m + "分" : ""}`;
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [filterEmployee, setFilterEmployee] = useState("");

  const fetchPayrolls = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterEmployee) params.set("employeeId", filterEmployee);
    const res = await fetch(`/api/admin/payroll?${params}`);
    const data = await res.json();
    setPayrolls(data.payrolls);
  }, [filterEmployee]);

  useEffect(() => {
    fetch("/api/admin/employees").then(r => r.json()).then(d => setEmployees(d.employees));
  }, []);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">給与管理</h1>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <label className="block text-xs text-gray-600 mb-1">従業員で絞り込み</label>
        <select
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          className="border rounded-lg p-2 text-sm"
        >
          <option value="">全員</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.name}（{e.employeeCode}）</option>
          ))}
        </select>
      </div>

      {payrolls.length === 0 ? (
        <p className="text-center text-gray-400 py-8">給与確定データがありません</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">従業員</th>
                <th className="px-4 py-3 text-left">期間</th>
                <th className="px-4 py-3 text-right">実働</th>
                <th className="px-4 py-3 text-right">基本給</th>
                <th className="px-4 py-3 text-right">深夜割増</th>
                <th className="px-4 py-3 text-right">残業割増</th>
                <th className="px-4 py-3 text-right">インセンティブ</th>
                <th className="px-4 py-3 text-right">合計</th>
                <th className="px-4 py-3 text-left">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrolls.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.employee.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.periodStart} 〜 {p.periodEnd}</td>
                  <td className="px-4 py-3 text-right">{fmtMins(p.workMinutes)}</td>
                  <td className="px-4 py-3 text-right">¥{p.baseAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-purple-600">
                    {p.nightAmount > 0 ? `+¥${p.nightAmount.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600">
                    {p.overtimeAmount > 0 ? `+¥${p.overtimeAmount.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {p.incentive > 0 ? `+¥${p.incentive.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">
                    ¥{p.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
