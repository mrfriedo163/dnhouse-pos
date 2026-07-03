import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { generateAndUploadBill } from "@/lib/bill";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.active) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await generateAndUploadBill(params.id);
  if (!result.ok) return NextResponse.redirect(new URL(`/orders/${params.id}?drive=fail`, request.url), 302);
  return NextResponse.redirect(new URL(`/orders/${params.id}?created=1`, request.url), 302);
}
