import { getEmployeeSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getEmployeeSession();
  if (!session) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white shadow">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-bold">QR勤怠 - {session.name}</span>
          <a href="/" className="text-blue-200 text-sm hover:text-white">トップ</a>
        </div>
      </nav>
      <main className="max-w-2xl mx-auto p-4 pt-6">{children}</main>
    </div>
  );
}
