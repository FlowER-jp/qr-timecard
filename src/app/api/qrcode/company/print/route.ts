import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = req.nextUrl.origin;
  const url = `${baseUrl}/clock`;

  const svgString = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    width: 280,
  });

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>勤怠打刻 QRコード</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Meiryo", sans-serif;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #fff;
      border: 2.5px solid #1d4ed8;
      border-radius: 20px;
      padding: 36px 44px;
      text-align: center;
      max-width: 380px;
      width: 100%;
    }
    .badge {
      display: inline-block;
      background: #1d4ed8;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2em;
      padding: 3px 12px;
      border-radius: 999px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 28px;
    }
    .qr-wrap {
      display: inline-block;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 28px;
      background: #fff;
    }
    .qr-wrap svg { display: block; }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin-bottom: 22px;
    }
    .how-title {
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .steps { list-style: none; text-align: left; }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
    }
    .step-num {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #1d4ed8;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }
    .url {
      margin-top: 22px;
      font-size: 10px;
      color: #cbd5e1;
      word-break: break-all;
    }
    .print-btn {
      margin-top: 28px;
      padding: 10px 28px;
      background: #1d4ed8;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .print-btn:hover { background: #1e40af; }
    @media print {
      body { background: #fff; padding: 0; }
      .card { border-color: #1d4ed8; box-shadow: none; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">TIMECARD</span>
    <h1>勤怠打刻</h1>
    <p class="subtitle">出勤・退勤はこのQRコードをスキャン</p>

    <div class="qr-wrap">
      ${svgString}
    </div>

    <hr />

    <p class="how-title">使い方</p>
    <ul class="steps">
      <li class="step">
        <span class="step-num">1</span>
        <span>スマホのカメラでQRコードを読み取る</span>
      </li>
      <li class="step">
        <span class="step-num">2</span>
        <span>初回のみ：社員コードとPINを入力<br>「このスマホを記憶する」をONにすると次回から不要</span>
      </li>
      <li class="step">
        <span class="step-num">3</span>
        <span>2回目以降は自動認識 → 出勤 / 退勤ボタンを押すだけ</span>
      </li>
    </ul>

    <p class="url">${url}</p>
  </div>

  <button class="print-btn" onclick="window.print()">印刷する</button>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
