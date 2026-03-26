import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const forget = searchParams.get("forget") === "1";

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { maxAge: 0, path: "/" });

  if (forget) {
    res.cookies.set("remember_employee", "", { maxAge: 0, path: "/" });
  }

  return res;
}
