import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setting = await prisma.closingSetting.findFirst();
  return NextResponse.json({ closingDay: setting?.closingDay ?? 25 });
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { closingDay } = await req.json();
  const day = Number(closingDay);

  if (isNaN(day) || day < 1 || day > 28) {
    return NextResponse.json({ error: "締日は1〜28の間で設定してください" }, { status: 400 });
  }

  const existing = await prisma.closingSetting.findFirst();
  const setting = existing
    ? await prisma.closingSetting.update({ where: { id: existing.id }, data: { closingDay: day } })
    : await prisma.closingSetting.create({ data: { closingDay: day } });

  return NextResponse.json({ ok: true, setting });
}
