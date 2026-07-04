import { NextResponse } from "next/server";

const DEFAULT_WEBHOOK_URL =
  process.env.POS_WEBHOOK_URL ||
  process.env.NEXT_PUBLIC_POS_WEBHOOK_URL ||
  "https://script.google.com/macros/s/AKfycby_yqYsFTvyF9zrEDvX3UvmsOjjEzFAd7CSjpp2sxoMIIZGfzQtBEM69Xzl1Pu-oDKN/exec";

const WEBHOOK_SECRET =
  process.env.POS_WEBHOOK_SECRET ||
  process.env.NEXT_PUBLIC_POS_WEBHOOK_SECRET ||
  "DNHOUSE_SECRET_123";

type PosPayload = {
  webhookUrl?: string;
  secret?: string;
  token?: string;
  api_key?: string;
  [key: string]: unknown;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PosPayload;
    const webhookUrl = typeof body.webhookUrl === "string" && body.webhookUrl.trim()
      ? body.webhookUrl.trim()
      : DEFAULT_WEBHOOK_URL;

    const payload = {
      ...body,
      secret: WEBHOOK_SECRET,
      token: WEBHOOK_SECRET,
      api_key: WEBHOOK_SECRET,
      webhookUrl: undefined,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await response.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // Google Apps Script sometimes returns plain text during errors.
    }

    if (!response.ok || text.includes('"ok":false')) {
      return NextResponse.json(
        { ok: false, error: "Google Sheet rejected the sync request.", detail: data },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown sync error" },
      { status: 500 },
    );
  }
}
