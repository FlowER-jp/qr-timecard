import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { employeeId } = await params;
  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const url = `${baseUrl}/clock/${employeeId}`;

  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    width: 300,
  });

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
