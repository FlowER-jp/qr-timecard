import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">QR勤怠管理</h1>
        <p className="text-gray-500 text-sm mb-8">
          QRコードをスキャンして出退勤を記録
        </p>
        <div className="space-y-3">
          <Link
            href="/admin/login"
            className="block w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition"
          >
            管理者ログイン
          </Link>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          従業員の方は印刷されたQRコードをスキャンしてください
        </p>
      </div>
    </main>
  );
}
