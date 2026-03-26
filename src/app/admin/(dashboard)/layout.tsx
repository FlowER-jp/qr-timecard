import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav username={session.username} />
      <main className="max-w-5xl mx-auto p-4 pt-6">{children}</main>
    </div>
  );
}
