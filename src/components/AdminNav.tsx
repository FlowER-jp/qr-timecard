"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/admin/employees", label: "従業員管理" },
    { href: "/admin/records", label: "勤怠一覧" },
    { href: "/admin/settings", label: "設定" },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <nav className="bg-gray-800 text-white shadow">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg">QR勤怠</span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition ${
                pathname.startsWith(l.href)
                  ? "text-white border-b-2 border-blue-400 pb-0.5"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-300">{username}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white">
            ログアウト
          </button>
        </div>
      </div>
    </nav>
  );
}
